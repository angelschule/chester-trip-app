// Zentrale Notfallkontakte/Adressen — gespeichert in Firebase Firestore, damit die
// ganze Gruppe die Liste sehen kann (nicht mehr nur lokal wie vorher in notfall.js).
// Jede Person meldet sich anonym an (kein Account/Passwort) und bekommt dadurch eine
// feste, geräteweite ID. Über diese ID kann sie NUR ihren eigenen Eintrag ändern —
// siehe Firestore-Sicherheitsregeln in README.md. Versicherungsdaten sind hiervon
// ausgenommen und bleiben lokal (siehe notfall.js).
//
// Zugangs-Anfragen: neue Personen tragen ihren Namen ein und tippen auf "Zugang
// anfragen" (setzt status:"pending"). Erst wenn das Admin-Gerät (js/admin-config.js)
// das bestätigt (status:"approved"), sieht diese Person die Gruppe/Karte — das wird
// nicht nur im UI versteckt, sondern auch in den Firestore-Regeln erzwungen, damit
// niemand sich selbst über die Browser-Konsole freischalten kann.
//
// Profilbilder werden im Browser vor dem Hochladen auf PHOTO_SIZE×PHOTO_SIZE verkleinert
// (Canvas API) und als Data-URL direkt im Kontakt-Dokument gespeichert — kein separater
// Speicherdienst nötig, bleibt weit unter Firestores 1-MiB-Dokumentgrenze.

const CONTACT_FIELDS = ["name", "gastfamilieName", "gastfamilieAdresse", "gastfamilieTelefon", "betreuungName", "betreuungTelefon"];
const PHOTO_SIZE = 200;
const PHOTO_QUALITY = 0.75;

let contactsDb = null;
let contactsUid = null;

function getContactsDb() {
  if (contactsDb) return contactsDb;
  if (typeof firebase === "undefined") return null; // Firebase-Skripte nicht geladen (z. B. offline)
  if (!firebaseConfig || firebaseConfig.apiKey === "HIER-EINTRAGEN") return null; // noch nicht eingerichtet
  firebase.initializeApp(firebaseConfig);
  contactsDb = firebase.firestore();
  return contactsDb;
}

function waitForAnonymousAuth() {
  return new Promise((resolve, reject) => {
    firebase.auth().onAuthStateChanged((user) => {
      if (user) { resolve(user.uid); return; }
      firebase.auth().signInAnonymously().catch(reject);
    }, reject);
  });
}

function isAdminUser() {
  return typeof ADMIN_UID !== "undefined" && ADMIN_UID !== "HIER-EINTRAGEN" && contactsUid === ADMIN_UID;
}

function setContactsStatus(text) {
  const statusEl = document.getElementById("contacts-status");
  if (statusEl) statusEl.textContent = text;
}

// state: "admin" | "approved" | "none" | "pending" | "denied"
function setAccessView(state) {
  const requestCard = document.getElementById("access-request-card");
  const pendingBanner = document.getElementById("access-pending-banner");
  const deniedBanner = document.getElementById("access-denied-banner");
  const memberContent = document.getElementById("member-content");
  const groupSection = document.getElementById("group-section");
  const unlocked = state === "approved" || state === "admin";

  if (requestCard) requestCard.style.display = state === "none" ? "block" : "none";
  if (pendingBanner) pendingBanner.style.display = state === "pending" ? "block" : "none";
  if (deniedBanner) deniedBanner.style.display = state === "denied" ? "block" : "none";
  if (memberContent) memberContent.style.display = unlocked ? "flex" : "none";
  if (groupSection) groupSection.style.display = unlocked ? "block" : "none";
}

async function requestAccess(docRef) {
  try {
    await docRef.set({ status: "pending", requestedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (e) {
    setContactsStatus("Konnte Anfrage nicht senden — Internetverbindung prüfen.");
  }
}

async function initContactsForm() {
  const db = getContactsDb();
  if (!db) {
    setContactsStatus(
      typeof firebase === "undefined"
        ? "Keine Verbindung — Kontakte der Gruppe sind offline nicht verfügbar."
        : "Firebase noch nicht eingerichtet — trag die Zugangsdaten in js/firebase-config.js ein."
    );
    return;
  }

  try {
    contactsUid = await waitForAnonymousAuth();
  } catch (e) {
    setContactsStatus("Verbindung zur Gruppe fehlgeschlagen — bitte später erneut versuchen.");
    return;
  }

  const docRef = db.collection("contacts").doc(contactsUid);

  CONTACT_FIELDS.forEach((field) => {
    const el = document.getElementById(field);
    if (!el) return;
    el.addEventListener("change", () => saveContactField(docRef, field, el.value));
  });
  initPhotoUpload(docRef);

  const requestBtn = document.getElementById("request-access-btn");
  if (requestBtn) requestBtn.addEventListener("click", () => requestAccess(docRef));
  const retryBtn = document.getElementById("retry-access-btn");
  if (retryBtn) retryBtn.addEventListener("click", () => requestAccess(docRef));

  if (isAdminUser()) {
    setAccessView("admin");
    setContactsStatus("Wird automatisch gespeichert und mit deiner Gruppe geteilt.");
    subscribeAdminRequests(db);
    loadGroupContacts("group-contacts-list");
  }

  docRef.onSnapshot((snap) => {
    const data = snap.exists ? snap.data() : {};

    CONTACT_FIELDS.forEach((field) => {
      const el = document.getElementById(field);
      if (el && document.activeElement !== el && data[field] !== undefined) el.value = data[field];
    });
    showPhotoPreview(data.photo);
    updateNotfallLinks();

    if (!isAdminUser()) {
      const state = data.status === "approved" ? "approved" : (data.status || "none");
      setAccessView(state);
      setContactsStatus(
        state === "approved"
          ? "Wird automatisch gespeichert und mit deiner Gruppe geteilt."
          : "Wird automatisch gespeichert, sobald dein Zugang bestätigt ist."
      );
      if (state === "approved") loadGroupContacts("group-contacts-list");
    }
  }, () => {
    setContactsStatus("Konnte deine Daten nicht laden — Internetverbindung prüfen.");
  });
}

async function saveContactField(docRef, field, value) {
  try {
    await docRef.set({ [field]: value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
  } catch (e) {
    setContactsStatus("Konnte nicht speichern — Internetverbindung prüfen.");
  }
}

function showPhotoPreview(dataUrl) {
  const img = document.getElementById("photo-preview");
  const placeholder = document.getElementById("photo-placeholder");
  if (!img) return;
  if (dataUrl) {
    img.src = dataUrl;
    img.style.display = "block";
    if (placeholder) placeholder.style.display = "none";
  } else {
    img.style.display = "none";
    if (placeholder) placeholder.style.display = "flex";
  }
}

function resizeImageToSquareDataUrl(file, size, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function initPhotoUpload(docRef) {
  const input = document.getElementById("photo-input");
  if (!input) return;
  input.addEventListener("change", async () => {
    const file = input.files[0];
    if (!file) return;
    setContactsStatus("Bild wird verkleinert …");
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file, PHOTO_SIZE, PHOTO_QUALITY);
      showPhotoPreview(dataUrl);
      await docRef.set({ photo: dataUrl, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } catch (e) {
      setContactsStatus("Konnte Bild nicht verarbeiten — anderes Bild versuchen.");
    }
  });
}

function initialsFromName(name) {
  return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("") || "?";
}

function loadGroupContacts(listId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  const db = getContactsDb();
  if (!db) {
    listEl.innerHTML = `<div class="empty-state">${
      typeof firebase === "undefined" ? "Offline nicht verfügbar." : "Firebase noch nicht eingerichtet."
    }</div>`;
    return;
  }

  listEl.innerHTML = `<div class="empty-state">Gruppe wird geladen …</div>`;

  db.collection("contacts").onSnapshot((snapshot) => {
    const others = snapshot.docs
      .filter((doc) => doc.id !== contactsUid)
      .map((doc) => doc.data())
      .filter((c) => c.name && (c.status === "approved" || isAdminUser()));

    if (others.length === 0) {
      listEl.innerHTML = `<div class="empty-state">Noch niemand sonst aus der Gruppe hat seine Daten eingetragen.</div>`;
      return;
    }

    listEl.innerHTML = others.map(renderGroupContactCard).join("");
  }, () => {
    listEl.innerHTML = `<div class="empty-state">Gruppe konnte nicht geladen werden.</div>`;
  });
}

function renderGroupContactCard(c) {
  const gastLine = c.gastfamilieName || c.gastfamilieAdresse || c.gastfamilieTelefon
    ? `<div style="font-size:12.5px;margin-bottom:6px;">
         <span class="secondary">Gastfamilie:</span> ${escapeHtml(c.gastfamilieName || "–")}<br>
         <span class="secondary">${escapeHtml(c.gastfamilieAdresse || "")}</span>
         ${c.gastfamilieTelefon ? ` · <a href="tel:${escapeHtml(c.gastfamilieTelefon.replace(/\s+/g, ""))}" style="color:var(--accent-blue);font-weight:600;">${escapeHtml(c.gastfamilieTelefon)}</a>` : ""}
       </div>`
    : "";
  const betreuungLine = c.betreuungName || c.betreuungTelefon
    ? `<div style="font-size:12.5px;">
         <span class="secondary">Betreuung:</span> ${escapeHtml(c.betreuungName || "–")}
         ${c.betreuungTelefon ? ` · <a href="tel:${escapeHtml(c.betreuungTelefon.replace(/\s+/g, ""))}" style="color:var(--accent-blue);font-weight:600;">${escapeHtml(c.betreuungTelefon)}</a>` : ""}
       </div>`
    : "";
  const avatar = c.photo
    ? `<img src="${c.photo}" alt="" style="flex:none;width:40px;height:40px;border-radius:50%;object-fit:cover;">`
    : `<div style="flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent-purple);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${escapeHtml(initialsFromName(c.name))}</div>`;

  return `<div class="card" style="display:flex;gap:12px;">
    ${avatar}
    <div style="flex:1 1 auto;">
      <div style="font-weight:600;font-size:14px;margin-bottom:8px;">${escapeHtml(c.name)}</div>
      ${gastLine}${betreuungLine}
    </div>
  </div>`;
}

function subscribeAdminRequests(db) {
  const section = document.getElementById("admin-requests-section");
  const listEl = document.getElementById("admin-requests-list");
  if (!section || !listEl) return;
  section.style.display = "block";

  db.collection("contacts").where("status", "==", "pending").onSnapshot((snapshot) => {
    if (snapshot.empty) {
      listEl.innerHTML = `<div class="empty-state">Keine offenen Anfragen.</div>`;
      return;
    }
    listEl.innerHTML = snapshot.docs.map((doc) => renderAdminRequestRow(doc.id, doc.data())).join("");
    snapshot.docs.forEach((doc) => {
      const approveBtn = document.getElementById(`approve-${doc.id}`);
      const denyBtn = document.getElementById(`deny-${doc.id}`);
      if (approveBtn) approveBtn.addEventListener("click", () => approveRequest(db, doc.id));
      if (denyBtn) denyBtn.addEventListener("click", () => denyRequest(db, doc.id));
    });
  }, () => {
    listEl.innerHTML = `<div class="empty-state">Anfragen konnten nicht geladen werden.</div>`;
  });
}

function renderAdminRequestRow(uid, data) {
  return `<div class="card" style="display:flex;align-items:center;gap:12px;">
    <div style="flex:1 1 auto;font-weight:600;font-size:14px;">${escapeHtml(data.name || "Unbekannt")}</div>
    <button id="approve-${uid}" aria-label="Erlauben" class="icon-btn" style="background:var(--accent-blue);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l5 5L20 6"></path></svg>
    </button>
    <button id="deny-${uid}" aria-label="Ablehnen" class="icon-btn" style="background:var(--danger-bg);color:var(--danger);">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>
    </button>
  </div>`;
}

async function approveRequest(db, uid) {
  try {
    await db.collection("contacts").doc(uid).set({ status: "approved" }, { merge: true });
  } catch (e) { /* Zeile bleibt in der Liste sichtbar, Admin kann erneut tippen */ }
}

async function denyRequest(db, uid) {
  try {
    await db.collection("contacts").doc(uid).set({ status: "denied" }, { merge: true });
  } catch (e) { /* Zeile bleibt in der Liste sichtbar, Admin kann erneut tippen */ }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
