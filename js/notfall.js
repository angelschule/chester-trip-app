// Notfall — Versicherungsdaten bleiben lokal (localStorage) auf diesem Gerät, nirgendwo
// hochgeladen. Gastfamilie/Betreuung-Kontakte werden dagegen zentral in Firebase
// gespeichert (siehe js/contacts.js), damit die ganze Gruppe sie sehen kann.

const NOTFALL_LOCAL_FIELDS = ["versicherungName", "versicherungNummer"];

function loadNotfallData() {
  try {
    return JSON.parse(localStorage.getItem("chester-notfall") || "{}");
  } catch (e) {
    return {};
  }
}

function saveNotfallField(field, value) {
  const data = loadNotfallData();
  data[field] = value;
  localStorage.setItem("chester-notfall", JSON.stringify(data));
}

function initNotfallForm() {
  const data = loadNotfallData();
  NOTFALL_LOCAL_FIELDS.forEach((field) => {
    const el = document.getElementById(field);
    if (!el) return;
    if (data[field]) el.value = data[field];
    el.addEventListener("change", () => saveNotfallField(field, el.value));
  });
  updateNotfallLinks();
  initContactsForm();
}

function updateNotfallLinks() {
  const gastPhone = document.getElementById("gastfamilieTelefon");
  const gastCallLink = document.getElementById("gast-call-link");
  if (gastCallLink) {
    if (gastPhone && gastPhone.value) {
      gastCallLink.href = "tel:" + gastPhone.value.replace(/\s+/g, "");
      gastCallLink.style.display = "flex";
    } else {
      gastCallLink.style.display = "none";
    }
  }

  const betreuungPhone = document.getElementById("betreuungTelefon");
  const betreuungCallLink = document.getElementById("betreuung-call-link");
  if (betreuungCallLink) {
    if (betreuungPhone && betreuungPhone.value) {
      betreuungCallLink.href = "tel:" + betreuungPhone.value.replace(/\s+/g, "");
      betreuungCallLink.style.display = "flex";
    } else {
      betreuungCallLink.style.display = "none";
    }
  }
}

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}
