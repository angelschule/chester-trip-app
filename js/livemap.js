// Live-Standort der Gruppe ("Snap Map"-Stil) — zeigt auf einer Karte, wer von der Gruppe
// gerade wo ist, aber NUR für Personen, die das über den Schalter aktiv eingeschaltet
// haben. Reuses die Firebase-Verbindung/anonyme Anmeldung aus js/contacts.js.
//
// Wichtige Einschränkung: aktualisiert sich nur, solange die App bei der jeweiligen
// Person offen ist — kein Hintergrund-Tracking, das geht bei einer reinen Web-App
// technisch nicht. Der letzte bekannte Standort bleibt trotzdem sichtbar (mit
// Zeitangabe, z. B. "vor 12 Min"), statt einfach zu verschwinden — Marker werden nur
// optisch grau statt lila, sobald sie seit LOCATION_LIVE_THRESHOLD_MS nicht mehr
// aktualisiert wurden, damit klar bleibt, was gerade live ist und was nicht.
//
// Beim Ausschalten wird der eigene Standort-Eintrag sofort aus Firestore gelöscht.

const LOCATION_MIN_INTERVAL_MS = 45000;
const LOCATION_MIN_DISTANCE_M = 25;
const LOCATION_LIVE_THRESHOLD_MS = 2 * 60 * 1000;
const LOCATION_REFRESH_MS = 30000;
const LOCATION_PREF_KEY = "chester-share-location";

let locationWatchId = null;
let lastWrittenPos = null;
let lastWriteTime = 0;
let liveMap = null;
let liveMarkers = {};
let lastLocationEntries = [];
const contactCache = {};

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

  setInterval(() => {
    if (lastLocationEntries.length === 0) return;
    renderLiveMarkers(lastLocationEntries);
    const listEl = document.getElementById("live-locations-list");
    if (listEl) renderLiveLocationsList(listEl, lastLocationEntries);
  }, LOCATION_REFRESH_MS);
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

function markerIcon(label, color, photo) {
  const inner = photo
    ? `<img src="${photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    : escapeHtml(label);
  return L.divIcon({
    className: "",
    html: `<div class="map-marker" style="background:${photo ? "#FFFFFF" : color};${photo ? "overflow:hidden;padding:0;" : ""}">${inner}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function updateOwnMarker(pos) {
  if (!liveMap) return;
  if (!liveMarkers.__self) {
    liveMarkers.__self = L.marker([pos.lat, pos.lon], { icon: markerIcon("Du", "var(--accent-blue)") }).addTo(liveMap);
    liveMap.setView([pos.lat, pos.lon], 14);
  } else {
    liveMarkers.__self.setLatLng([pos.lat, pos.lon]);
  }
}

async function getCachedContact(db, uid) {
  if (contactCache[uid]) return contactCache[uid];
  try {
    const snap = await db.collection("contacts").doc(uid).get();
    const data = snap.exists ? snap.data() : {};
    const contact = { name: data.name || "Unbekannt", photo: data.photo || null };
    contactCache[uid] = contact;
    return contact;
  } catch (e) {
    return { name: "Unbekannt", photo: null };
  }
}

function formatRelativeTime(ms) {
  if (!ms) return "unbekannt";
  const diffSec = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (diffSec < 60) return "gerade eben";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `vor ${diffH} Std`;
  const diffD = Math.round(diffH / 24);
  return `vor ${diffD} Tag${diffD === 1 ? "" : "en"}`;
}

function isLiveEntry(updatedAt) {
  return !!updatedAt && (Date.now() - updatedAt) < LOCATION_LIVE_THRESHOLD_MS;
}

function subscribeToGroupLocations() {
  const db = getContactsDb();
  const listEl = document.getElementById("live-locations-list");
  if (!db || !listEl) return;

  db.collection("locations").onSnapshot(async (snapshot) => {
    const others = snapshot.docs.filter((doc) => doc.id !== contactsUid);

    const entries = await Promise.all(others.map(async (doc) => {
      const data = doc.data();
      const updatedAt = data.updatedAt && data.updatedAt.toMillis ? data.updatedAt.toMillis() : null;
      const contact = await getCachedContact(db, doc.id);
      return { id: doc.id, name: contact.name, photo: contact.photo, lat: data.lat, lon: data.lon, updatedAt };
    }));

    lastLocationEntries = entries;
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
    const color = isLiveEntry(e.updatedAt) ? "var(--accent-purple)" : "var(--accent-gray)";
    const icon = markerIcon(initialsFromName(e.name), color, e.photo);
    const popup = `${escapeHtml(e.name)} · ${escapeHtml(formatRelativeTime(e.updatedAt))}`;
    if (liveMarkers[e.id]) {
      liveMarkers[e.id].setLatLng([e.lat, e.lon]);
      liveMarkers[e.id].setIcon(icon);
      liveMarkers[e.id].setPopupContent(popup);
    } else {
      liveMarkers[e.id] = L.marker([e.lat, e.lon], { icon }).bindPopup(popup).addTo(liveMap);
    }
  });
  Object.keys(liveMarkers).forEach((id) => {
    if (id !== "__self" && !seen.has(id)) {
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
      const live = isLiveEntry(e.updatedAt);
      const timeLabel = `${live ? "Live" : "Zuletzt gesehen"} · ${escapeHtml(formatRelativeTime(e.updatedAt))}`;
      const avatar = e.photo
        ? `<img src="${e.photo}" alt="" style="flex:none;width:36px;height:36px;border-radius:50%;object-fit:cover;">`
        : `<div style="flex:none;width:36px;height:36px;border-radius:50%;background:${live ? "var(--accent-purple)" : "var(--accent-gray)"};color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${escapeHtml(initialsFromName(e.name))}</div>`;
      return `<div class="card row-hover" style="display:flex;align-items:center;gap:12px;">
        ${avatar}
        <div style="flex:1 1 auto;">
          <div style="font-size:13.5px;font-weight:600;">${escapeHtml(e.name)}</div>
          <div class="secondary" style="font-size:11.5px;margin-top:1px;">${timeLabel}</div>
        </div>
        ${dist ? `<div style="flex:none;font-size:12px;font-weight:600;color:var(--accent-blue);background:var(--weather-bg);border-radius:999px;padding:5px 11px;">${dist}</div>` : ""}
      </div>`;
    }).join("");
  });
}
