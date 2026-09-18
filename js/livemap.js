// Live-Standort der Gruppe ("Snap Map"-Stil) — zeigt auf einer Karte, wer von der Gruppe
// gerade wo ist, aber NUR für Personen, die das über den Schalter aktiv eingeschaltet
// haben. Reuses die Firebase-Verbindung/anonyme Anmeldung aus js/contacts.js.
//
// Wichtige Einschränkung: aktualisiert sich nur, solange die App bei der jeweiligen
// Person offen ist — kein Hintergrund-Tracking, das geht bei einer reinen Web-App
// technisch nicht. Positionen, die seit STALE_MS nicht mehr aktualisiert wurden, gelten
// als nicht mehr aktuell und werden ausgeblendet, damit niemand eine veraltete Position
// für live hält (z. B. wenn jemand die App einfach offen gelassen hat).
//
// Beim Ausschalten wird der eigene Standort-Eintrag sofort aus Firestore gelöscht.

const LOCATION_MIN_INTERVAL_MS = 45000;
const LOCATION_MIN_DISTANCE_M = 25;
const LOCATION_STALE_MS = 15 * 60 * 1000;
const LOCATION_PREF_KEY = "chester-share-location";

let locationWatchId = null;
let lastWrittenPos = null;
let lastWriteTime = 0;
let liveMap = null;
let liveMarkers = {};
const nameCache = {};

function isSharingEnabled() {
  return localStorage.getItem(LOCATION_PREF_KEY) === "1";
}

function setSharingPreference(on) {
  localStorage.setItem(LOCATION_PREF_KEY, on ? "1" : "0");
}

function setLocationStatus(text) {
  const el = document.getElementById("location-status");
  if (el) el.textContent = text;
}

function updateToggleUI(on) {
  const toggle = document.getElementById("location-toggle");
  if (toggle) toggle.setAttribute("aria-checked", on ? "true" : "false");
}

async function initLiveMap() {
  initLiveMapView();

  const toggle = document.getElementById("location-toggle");
  if (toggle) toggle.addEventListener("click", toggleLocationSharing);

  const db = getContactsDb();
  if (!db) {
    setLocationStatus("Firebase noch nicht eingerichtet.");
    return;
  }

  try {
    contactsUid = await waitForAnonymousAuth();
  } catch (e) {
    setLocationStatus("Verbindung fehlgeschlagen — bitte später erneut versuchen.");
    return;
  }

  if (isSharingEnabled()) {
    startSharing();
  } else {
    updateToggleUI(false);
    setLocationStatus("Ausgeschaltet — nur du entscheidest, ob die Gruppe deinen Standort sieht.");
  }

  subscribeToGroupLocations();
}

async function toggleLocationSharing() {
  if (isSharingEnabled()) {
    stopSharing();
  } else {
    await startSharing();
  }
}

async function startSharing() {
  const db = getContactsDb();
  if (!db) {
    setLocationStatus("Firebase noch nicht eingerichtet.");
    return;
  }
  if (!("geolocation" in navigator)) {
    setLocationStatus("Standort auf diesem Gerät nicht verfügbar.");
    return;
  }
  if (!contactsUid) {
    try {
      contactsUid = await waitForAnonymousAuth();
    } catch (e) {
      setLocationStatus("Verbindung fehlgeschlagen.");
      return;
    }
  }

  setSharingPreference(true);
  updateToggleUI(true);
  setLocationStatus("Standort wird ermittelt …");

  locationWatchId = navigator.geolocation.watchPosition(
    (pos) => handlePosition(db, pos),
    () => {
      setLocationStatus("Standort nicht verfügbar — Berechtigung erteilt?");
      stopSharing();
    },
    { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
  );
}

function stopSharing() {
  setSharingPreference(false);
  updateToggleUI(false);
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
  }
  setLocationStatus("Ausgeschaltet — nur du entscheidest, ob die Gruppe deinen Standort sieht.");

  const db = getContactsDb();
  if (db && contactsUid) {
    db.collection("locations").doc(contactsUid).delete().catch(() => {});
  }
  if (liveMarkers.__self) {
    liveMap.removeLayer(liveMarkers.__self);
    delete liveMarkers.__self;
  }
}

function handlePosition(db, pos) {
  const current = { lat: pos.coords.latitude, lon: pos.coords.longitude };
  const now = Date.now();
  const movedEnough = !lastWrittenPos || distanceMeters(lastWrittenPos, current) >= LOCATION_MIN_DISTANCE_M;
  const dueForUpdate = now - lastWriteTime >= LOCATION_MIN_INTERVAL_MS;

  updateOwnMarker(current);

  if (!movedEnough && !dueForUpdate) return;

  lastWrittenPos = current;
  lastWriteTime = now;

  db.collection("locations").doc(contactsUid).set({
    lat: current.lat,
    lon: current.lon,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    setLocationStatus("Wird geteilt · zuletzt aktualisiert gerade eben.");
  }).catch(() => {
    setLocationStatus("Konnte Standort nicht speichern — Internetverbindung prüfen.");
  });
}

function initLiveMapView() {
  if (typeof L === "undefined") return;
  const mapEl = document.getElementById("live-map");
  if (!mapEl || liveMap) return;
  liveMap = L.map(mapEl).setView([53.1934, -2.8931], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(liveMap);
}

function markerIcon(label, color) {
  return L.divIcon({
    className: "",
    html: `<div class="map-marker" style="background:${color};">${escapeHtml(label)}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function initialsFromName(name) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
}

function updateOwnMarker(pos) {
  if (!liveMap) return;
  if (!liveMarkers.__self) {
    liveMarkers.__self = L.marker([pos.lat, pos.lon], { icon: markerIcon("Du", "#0071E3") }).addTo(liveMap);
    liveMap.setView([pos.lat, pos.lon], 14);
  } else {
    liveMarkers.__self.setLatLng([pos.lat, pos.lon]);
  }
}

async function getCachedName(db, uid) {
  if (nameCache[uid]) return nameCache[uid];
  try {
    const snap = await db.collection("contacts").doc(uid).get();
    const name = snap.exists && snap.data().name ? snap.data().name : "Unbekannt";
    nameCache[uid] = name;
    return name;
  } catch (e) {
    return "Unbekannt";
  }
}

function subscribeToGroupLocations() {
  const db = getContactsDb();
  const listEl = document.getElementById("live-locations-list");
  if (!db || !listEl) return;

  db.collection("locations").onSnapshot(async (snapshot) => {
    const now = Date.now();
    const fresh = snapshot.docs.filter((doc) => {
      if (doc.id === contactsUid) return false;
      const updatedAt = doc.data().updatedAt;
      const updatedMs = updatedAt && updatedAt.toMillis ? updatedAt.toMillis() : 0;
      return now - updatedMs < LOCATION_STALE_MS;
    });

    const entries = await Promise.all(fresh.map(async (doc) => {
      const data = doc.data();
      return { id: doc.id, name: await getCachedName(db, doc.id), lat: data.lat, lon: data.lon };
    }));

    renderLiveMarkers(entries);
    renderLiveLocationsList(listEl, entries);
  }, () => {
    listEl.innerHTML = `<div class="empty-state">Standorte konnten nicht geladen werden.</div>`;
  });
}

function renderLiveMarkers(entries) {
  if (!liveMap) return;
  const seen = new Set(["__self"]);
  entries.forEach((e) => {
    seen.add(e.id);
    const icon = markerIcon(initialsFromName(e.name), "#AF52DE");
    if (liveMarkers[e.id]) {
      liveMarkers[e.id].setLatLng([e.lat, e.lon]);
    } else {
      liveMarkers[e.id] = L.marker([e.lat, e.lon], { icon }).bindPopup(escapeHtml(e.name)).addTo(liveMap);
    }
  });
  Object.keys(liveMarkers).forEach((id) => {
    if (!seen.has(id)) {
      liveMap.removeLayer(liveMarkers[id]);
      delete liveMarkers[id];
    }
  });
}

function renderLiveLocationsList(listEl, entries) {
  if (entries.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Niemand aus der Gruppe teilt gerade seinen Standort.</div>`;
    return;
  }
  getPosition().then((myPos) => {
    listEl.innerHTML = entries.map((e) => {
      const dist = myPos.isFallback ? "" : formatDistance(distanceMeters(myPos, e));
      return `<div class="card row-hover" style="display:flex;align-items:center;gap:12px;">
        <div style="flex:none;width:36px;height:36px;border-radius:50%;background:var(--accent-purple);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${escapeHtml(initialsFromName(e.name))}</div>
        <div style="flex:1 1 auto;font-size:13.5px;font-weight:600;">${escapeHtml(e.name)}</div>
        ${dist ? `<div style="flex:none;font-size:12px;font-weight:600;color:var(--accent-blue);background:var(--weather-bg);border-radius:999px;padding:5px 11px;">${dist}</div>` : ""}
      </div>`;
    }).join("");
  });
}
