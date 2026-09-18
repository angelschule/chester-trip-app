// Shared geolocation helper.
// Falls back to Chester city centre if the user denies permission or it's unavailable,
// so the app still shows something useful instead of breaking.

const CHESTER_FALLBACK = { lat: 53.1934, lon: -2.8931, isFallback: true };

function getPosition() {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) {
      resolve(CHESTER_FALLBACK);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, isFallback: false }),
      () => resolve(CHESTER_FALLBACK),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

// Haversine distance in meters between two {lat, lon} points.
function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m) {
  if (m < 1000) return Math.round(m) + " m";
  return (m / 1000).toFixed(1).replace(".", ",") + " km";
}
