// "In der Nähe" — real nearby places from OpenStreetMap (Overpass API).
// No API key, no billing account, works anywhere in the world.

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_M = 800;

const FOOD_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v5M9 3v5M11 3v7M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v7"></path></svg>';
const SHOP_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l-1 12H7L6 8Z"></path><path d="M9 8V6a3 3 0 0 1 6 0v2"></path></svg>';
const NAV_ICON = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l17-8-8 17-2-7-7-2Z"></path></svg>';

const FOOD_TAGS = ["restaurant", "cafe", "fast_food", "pub", "bar"];
const SHOP_TAGS = ["convenience", "supermarket", "bakery", "greengrocer"];

let allPlaces = [];
let activeCategory = "alle";

function categoryLabel(kind) {
  return kind === "essen" ? "Essen" : "Einkaufen";
}

async function loadPlaces(listId) {
  const listEl = document.getElementById(listId);
  listEl.innerHTML = `<div class="empty-state">Standort wird ermittelt …</div>`;

  const pos = await getPosition();
  const foodQuery = FOOD_TAGS.map((t) => `node["amenity"="${t}"](around:${SEARCH_RADIUS_M},${pos.lat},${pos.lon});`).join("\n");
  const shopQuery = SHOP_TAGS.map((t) => `node["shop"="${t}"](around:${SEARCH_RADIUS_M},${pos.lat},${pos.lon});`).join("\n");
  const query = `[out:json][timeout:20];(${foodQuery}${shopQuery});out center;`;

  listEl.innerHTML = `<div class="empty-state">Orte in der Nähe werden geladen …</div>`;

  try {
    const res = await fetch(OVERPASS_URL, { method: "POST", body: "data=" + encodeURIComponent(query) });
    const data = await res.json();

    allPlaces = (data.elements || [])
      .filter((el) => el.tags && el.tags.name)
      .map((el) => {
        const isFood = FOOD_TAGS.includes(el.tags.amenity);
        const dist = distanceMeters(pos, { lat: el.lat, lon: el.lon });
        return {
          name: el.tags.name,
          category: isFood ? "essen" : "einkaufen",
          distanceM: dist,
          lat: el.lat,
          lon: el.lon
        };
      })
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, 25);

    if (pos.isFallback) {
      listEl.insertAdjacentHTML("beforebegin", `<div class="empty-state" style="margin-bottom:-4px;">Standort nicht verfügbar — zeige Orte rund um Chester-Zentrum.</div>`);
    }

    renderPlaces(listId);
  } catch (e) {
    listEl.innerHTML = `<div class="empty-state">Orte konnten nicht geladen werden – prüf deine Internetverbindung.</div>`;
  }
}

function renderPlaces(listId) {
  const listEl = document.getElementById(listId);
  const filtered = allPlaces.filter((p) => activeCategory === "alle" || p.category === activeCategory);

  if (filtered.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Nichts in der Nähe gefunden.</div>`;
    return;
  }

  listEl.innerHTML = filtered.map((p) => {
    const mapHref = `https://maps.apple.com/?daddr=${p.lat},${p.lon}&q=${encodeURIComponent(p.name)}`;
    const icon = p.category === "essen" ? FOOD_ICON : SHOP_ICON;
    return `
      <div class="card row-hover" style="display:flex;align-items:center;gap:12px;padding:14px 14px 14px 16px;">
        <div class="badge" style="background:var(--icon-tile-bg);color:var(--accent-blue);">${icon}</div>
        <div style="flex:1 1 auto;min-width:0;">
          <div style="font-weight:600;font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${categoryLabel(p.category)} · ${formatDistance(p.distanceM)}</div>
        </div>
        <a href="${mapHref}" aria-label="Route zu ${p.name} öffnen" class="icon-btn" style="background:var(--accent-blue);">${NAV_ICON}</a>
      </div>`;
  }).join("");
}

function setPlacesFilter(category, listId) {
  activeCategory = category;
  document.querySelectorAll(".chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.category === category);
  });
  renderPlaces(listId);
}
