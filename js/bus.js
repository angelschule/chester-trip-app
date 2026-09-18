// "Unterwegs" — real Chester bus stops and real scheduled departures.
//
// Data source: the UK Bus Open Data Service (BODS), official GTFS timetable
// feed for North West England, filtered down to Chester and pre-processed
// into two small files (chester-stops.json, chester-bus-connections.json)
// so the app itself needs no server or API key.
//
// This finds the REAL nearest stop to wherever you are right now, and only
// shows buses that actually run, on this route, all the way to the chosen
// destination (Chester Northgate for the school, Stamford Road/Blacon for
// the host family) — direct services only, no line changes/transfers.
// It is the published timetable, not live GPS tracking of the bus.

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const SCHOOL_ADDRESS = "ELC Chester, 9-11 Stanley Place, Chester CH1 2LU";
const GAST_ADDRESS = "23 Warwick Road, Blacon, Chester CH1 5BY";
const MAX_STOPS_TO_CHECK = 25; // how many nearest stops we'll look through for a direct connection

let chesterStops = null;
let connections = null;
let currentDest = "schule"; // "schule" | "gast"

async function loadBusData() {
  if (chesterStops && connections) return;
  const [stopsRes, connRes] = await Promise.all([
    fetch("js/chester-stops.json"),
    fetch("js/chester-bus-connections.json")
  ]);
  chesterStops = await stopsRes.json();
  connections = await connRes.json();
}

function minutesSinceMidnight(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function nextDeparturesForStop(stopId, destField) {
  const entries = connections[stopId];
  if (!entries) return [];

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const todayKey = DAY_KEYS[now.getDay()];

  const upcoming = [];
  entries.forEach((e) => {
    if (e[destField] === null || e[destField] === undefined) return;
    if (!e.days[todayKey]) return;
    const depMin = minutesSinceMidnight(e.dep);
    let diff = depMin - nowMin;
    if (diff < 0) diff += 24 * 60;
    upcoming.push({ line: e.line, headsign: e.headsign, minutes: diff });
  });

  upcoming.sort((a, b) => a.minutes - b.minutes);
  return upcoming.slice(0, 3);
}

async function renderBusScreen() {
  document.getElementById("stop-name").textContent = "Standort wird ermittelt …";
  document.getElementById("walk-to-stop").textContent = "";
  document.getElementById("departures-list").innerHTML = "";

  await loadBusData();
  const pos = await getPosition();
  const destField = currentDest === "schule" ? "toSchoolMin" : "toGastMin";
  const destAddress = currentDest === "schule" ? SCHOOL_ADDRESS : GAST_ADDRESS;

  const sorted = chesterStops
    .map((s) => ({ ...s, distanceM: distanceMeters(pos, { lat: s.lat, lon: s.lon }) }))
    .sort((a, b) => a.distanceM - b.distanceM);

  let chosenStop = null;
  let departures = [];
  for (const stop of sorted.slice(0, MAX_STOPS_TO_CHECK)) {
    const deps = nextDeparturesForStop(stop.id, destField);
    if (deps.length > 0) {
      chosenStop = stop;
      departures = deps;
      break;
    }
  }

  document.getElementById("map-link").href = "https://maps.apple.com/?daddr=" + encodeURIComponent(destAddress);
  document.getElementById("map-address").textContent = destAddress;

  if (pos.isFallback) {
    document.getElementById("stop-name").textContent = "Standort nicht verfügbar";
    document.getElementById("walk-to-stop").textContent = "Zeige Beispiel für Chester-Zentrum";
  }

  if (!chosenStop) {
    document.getElementById("stop-name").textContent = "Keine direkte Busverbindung in der Nähe gefunden";
    document.getElementById("walk-to-stop").textContent = "";
    document.getElementById("departures-list").innerHTML =
      '<div class="empty-state">Von hier fährt heute kein direkter Bus dorthin (nur direkte Verbindungen ohne Umsteigen werden angezeigt). Am besten laufen oder Richtung Chester Bus Interchange gehen.</div>';
    return;
  }

  const walkMin = Math.max(1, Math.round(chosenStop.distanceM / 80));
  document.getElementById("stop-name").textContent = chosenStop.name;
  document.getElementById("walk-to-stop").textContent = `${formatDistance(chosenStop.distanceM)} entfernt · ca. ${walkMin} Min zu Fuß`;

  document.getElementById("departures-list").innerHTML = departures.map((dep) => `
    <div class="card row-hover" style="display:flex;align-items:center;gap:12px;">
      <div style="flex:none;width:36px;height:36px;border-radius:10px;background:var(--accent-blue);color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${dep.line}</div>
      <div style="flex:1 1 auto;font-size:13.5px;">${dep.headsign}</div>
      <div style="flex:none;font-weight:700;font-size:15px;color:var(--accent-blue);">${dep.minutes}<span style="font-size:11px;font-weight:600;color:var(--text-secondary);"> Min</span></div>
    </div>`).join("");

  document.getElementById("seg-schule").classList.toggle("active", currentDest === "schule");
  document.getElementById("seg-gast").classList.toggle("active", currentDest === "gast");
}

function selectDestination(dest) {
  currentDest = dest;
  renderBusScreen();
}
