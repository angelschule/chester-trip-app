// Rückreise-Checkliste — saved in localStorage so it survives closing the app,
// but never leaves the phone (no server involved).

const CHECKLIST_ITEMS = [
  { id: "c1", label: "Reisepass / Perso" },
  { id: "c2", label: "Ladekabel & Steckdosenadapter (UK)" },
  { id: "c3", label: "Geschenke für zuhause" },
  { id: "c4", label: "Von der Gastfamilie verabschieden" },
  { id: "c5", label: "Zug-/Flugticket kontrollieren" }
];

function loadChecklistState() {
  try {
    return JSON.parse(localStorage.getItem("chester-checklist") || "{}");
  } catch (e) {
    return {};
  }
}

function saveChecklistState(state) {
  localStorage.setItem("chester-checklist", JSON.stringify(state));
}

function renderChecklist() {
  const state = loadChecklistState();
  const container = document.getElementById("checklist");
  container.innerHTML = CHECKLIST_ITEMS.map((item) => {
    const checked = !!state[item.id];
    const style = checked ? "color:var(--accent-gray);text-decoration:line-through;" : "color:var(--text-primary);";
    return `
      <div style="display:flex;align-items:center;gap:10px;">
        <input type="checkbox" id="${item.id}" ${checked ? "checked" : ""} onchange="toggleChecklistItem('${item.id}')" style="width:20px;height:20px;flex:none;accent-color:var(--accent-blue);">
        <label for="${item.id}" style="font-size:13.5px;margin:0;${style}">${item.label}</label>
      </div>`;
  }).join("");
}

function toggleChecklistItem(id) {
  const state = loadChecklistState();
  state[id] = !state[id];
  saveChecklistState(state);
  renderChecklist();
}
