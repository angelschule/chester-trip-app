// "Gruppe" — echte Distanz von deinem aktuellen Standort zu jedem Gastfamilien-Haushalt.
// Die Adressen kommen aus der Firestore-Collection "roster" (einmalig von Angel aus der
// Excel-Liste der Schule befüllt und über OpenStreetMap/Nominatim geokodiert — siehe
// README.md). Genau wie die übrigen Gruppendaten ist das nur für bestätigte Personen
// sichtbar (gleiche Zugangs-Freigabe, siehe js/contacts.js).

async function loadGroupDistances(listId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  const db = getContactsDb();
  if (!db) {
    listEl.innerHTML = `<div class="empty-state">Firebase noch nicht eingerichtet.</div>`;
    return;
  }

  listEl.innerHTML = `<div class="empty-state">Wird geladen …</div>`;

  let snapshot;
  try {
    snapshot = await db.collection("roster").get();
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state">Liste konnte nicht geladen werden.</div>`;
    return;
  }

  const people = snapshot.docs
    .map((doc) => doc.data())
    .filter((p) => typeof p.lat === "number" && typeof p.lon === "number");

  if (people.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Noch keine Adressen hinterlegt.</div>`;
    return;
  }

  const households = {};
  people.forEach((p) => {
    const key = p.householdId || `${p.lat},${p.lon}`;
    if (!households[key]) households[key] = { names: [], lat: p.lat, lon: p.lon };
    households[key].names.push(p.displayName || "");
  });

  const pos = await getPosition();
  const withDistance = Object.values(households)
    .map((h) => ({ ...h, namesJoined: h.names.filter(Boolean).join(" & "), distanceM: distanceMeters(pos, h) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  if (pos.isFallback) {
    listEl.insertAdjacentHTML("beforebegin", `<div class="empty-state" style="margin-bottom:-4px;">Standort nicht verfügbar — Distanzen ab Chester-Zentrum berechnet.</div>`);
  }

  listEl.innerHTML = withDistance.map((h) => `
    <div class="card row-hover" style="display:flex;align-items:center;gap:12px;">
      <div style="flex:none;width:40px;height:40px;border-radius:50%;background:var(--accent-purple);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;">${escapeHtml(initialsFromName(h.namesJoined))}</div>
      <div style="flex:1 1 auto;font-size:13.5px;font-weight:600;">${escapeHtml(h.namesJoined)}</div>
      <div style="flex:none;font-size:12px;font-weight:600;color:var(--accent-blue);background:var(--weather-bg);border-radius:999px;padding:5px 11px;">${formatDistance(h.distanceM)}</div>
    </div>`).join("");
}
