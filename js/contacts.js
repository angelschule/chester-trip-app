// Zentrale Notfallkontakte/Adressen — gespeichert in Firebase Firestore, damit die
// ganze Gruppe die Liste sehen kann (nicht mehr nur lokal wie vorher in notfall.js).
// Jede Person meldet sich anonym an (kein Account/Passwort) und bekommt dadurch eine
// feste, geräteweite ID. Über diese ID kann sie NUR ihren eigenen Eintrag ändern —
// siehe Firestore-Sicherheitsregeln in README.md. Versicherungsdaten sind hiervon
// ausgenommen und bleiben lokal (siehe notfall.js).
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

function setContactsStatus(text) {
  const statusEl = document.getElementById("contacts-status");
  if (statusEl) statusEl.textContent = text;
}

async function initContactsForm() {
  const db = getContactsDb();
  if (!db) {
    setContactsStatus(
      typeof firebase === "undefined"
        ? "Keine Verbindung — Kontakte der Gruppe sind offline nicht verfügbar."
        : "Firebase noch nicht eingerichtet — trag die Zugangsdaten in js/firebase-config.js ein."
    );
    loadGroupContacts("group-contacts-list");
    return;
  }

  try {
    contactsUid = await waitForAnonymousAuth();
  } catch (e) {
    setContactsStatus("Verbindung zur Gruppe fehlgeschlagen — bitte später erneut versuchen.");
    loadGroupContacts("group-contacts-list");
    return;
  }

  const docRef = db.collection("contacts").doc(contactsUid);
  let data = {};
  try {
    const snap = await docRef.get();
    data = snap.exists ? snap.data() : {};
  } catch (e) {
    setContactsStatus("Konnte deine Daten nicht laden — Internetverbindung prüfen.");
  }

  CONTACT_FIELDS.forEach((field) => {
    const el = document.getElementById(field);
    if (!el) return;
    if (data[field]) el.value = data[field];
    el.addEventListener("change", () => saveContactField(docRef, field, el.value));
  });

  showPhotoPreview(data.photo);
  initPhotoUpload(docRef);

  updateNotfallLinks();
  setContactsStatus("Wird automatisch gespeichert und mit deiner Gruppe geteilt.");
  loadGroupContacts("group-contacts-list");
}

async function saveContactField(docRef, field, value) {
  try {
    await docRef.set({ [field]: value, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    setContactsStatus("Gespeichert · mit deiner Gruppe geteilt.");
  } catch (e) {
    setContactsStatus("Konnte nicht speichern — Internetverbindung prüfen.");
  }
  updateNotfallLinks();
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
      setContactsStatus("Gespeichert · mit deiner Gruppe geteilt.");
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
      .filter((c) => c.name);

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

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
