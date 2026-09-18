// Notfall — editable fields (host family phone, buddy/chaperone contact, insurance)
// saved only in localStorage on this device. Nothing is sent anywhere.

const NOTFALL_FIELDS = ["gastPhone", "betreuungName", "betreuungPhone", "versicherungName", "versicherungNummer"];

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
  NOTFALL_FIELDS.forEach((field) => {
    const el = document.getElementById(field);
    if (!el) return;
    if (data[field]) el.value = data[field];
    el.addEventListener("change", () => saveNotfallField(field, el.value));
  });
  updateNotfallLinks();
}

function updateNotfallLinks() {
  const data = loadNotfallData();
  const gastCallLink = document.getElementById("gast-call-link");
  if (gastCallLink) {
    if (data.gastPhone) {
      gastCallLink.href = "tel:" + data.gastPhone.replace(/\s+/g, "");
      gastCallLink.style.display = "flex";
    } else {
      gastCallLink.style.display = "none";
    }
  }
  const betreuungCallLink = document.getElementById("betreuung-call-link");
  if (betreuungCallLink) {
    if (data.betreuungPhone) {
      betreuungCallLink.href = "tel:" + data.betreuungPhone.replace(/\s+/g, "");
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
