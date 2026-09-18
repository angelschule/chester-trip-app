// "Gruppe" — real distance from wherever you are right now to each classmate's
// host family address (geocoded once in advance, so no extra API call needed here).

const CLASSMATES = [
  { initials: "LB", names: "Lenn Messmer & Baha Caliskan", lat: 53.204105, lon: -2.928449 },
  { initials: "AB", names: "Alex Seeholzer & Bela Schmid", lat: 53.211647, lon: -2.927264 },
  { initials: "FS", names: "Felix Anderes & Sander Van Luijk", lat: 53.204696, lon: -2.932234 }
];

async function loadGroupDistances(listId) {
  const listEl = document.getElementById(listId);
  listEl.innerHTML = `<div class="empty-state">Standort wird ermittelt …</div>`;

  const pos = await getPosition();
  const withDistance = CLASSMATES
    .map((c) => ({ ...c, distanceM: distanceMeters(pos, c) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  if (pos.isFallback) {
    listEl.insertAdjacentHTML("beforebegin", `<div class="empty-state" style="margin-bottom:-4px;">Standort nicht verfügbar — Distanzen ab Chester-Zentrum berechnet.</div>`);
  }

  listEl.innerHTML = withDistance.map((c) => `
    <div class="card row-hover" style="display:flex;align-items:center;gap:12px;">
      <div style="flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent-purple);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${c.initials}</div>
      <div style="flex:1 1 auto;font-size:13.5px;font-weight:600;">${c.names}</div>
      <div style="flex:none;font-size:12px;font-weight:600;color:var(--accent-blue);background:var(--weather-bg);border-radius:999px;padding:5px 11px;">${formatDistance(c.distanceM)}</div>
    </div>`).join("");
}
