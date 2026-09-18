// Live weather for the Home screen — Open-Meteo is free, needs no API key,
// and allows direct browser requests (CORS-enabled).

const WEATHER_CODE_LABELS = {
  0: "Klar", 1: "Meist klar", 2: "Teilweise bewölkt", 3: "Bewölkt",
  45: "Nebel", 48: "Reifnebel",
  51: "Leichter Nieselregen", 53: "Nieselregen", 55: "Starker Nieselregen",
  61: "Leichter Regen", 63: "Regen", 65: "Starker Regen",
  71: "Leichter Schnee", 73: "Schnee", 75: "Starker Schnee",
  80: "Regenschauer", 81: "Regenschauer", 82: "Heftige Schauer",
  95: "Gewitter", 96: "Gewitter mit Hagel", 99: "Gewitter mit Hagel"
};

function weatherIconSVG(code) {
  const rainy = [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code);
  const stormy = [95, 96, 99].includes(code);
  const clear = [0, 1].includes(code);
  if (clear) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4.5"></circle><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"></path></svg>';
  }
  if (stormy) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 15a4 4 0 0 1 .3-8 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 15H7Z"></path><path d="M12 15l-2 4h3l-2 4"></path></svg>';
  }
  if (rainy) {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 13a4 4 0 0 1 .3-8 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 13H7Z"></path><path d="M8 17v3M12 17v3M16 17v3"></path></svg>';
  }
  return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17a4 4 0 0 1 .3-8 5 5 0 0 1 9.6 1.5A3.5 3.5 0 0 1 17 17H7Z"></path></svg>';
}

async function loadWeather(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  try {
    const pos = await getPosition();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}&current=temperature_2m,weather_code,precipitation_probability&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const temp = Math.round(data.current.temperature_2m);
    const code = data.current.weather_code;
    const rainChance = data.current.precipitation_probability;
    const label = WEATHER_CODE_LABELS[code] || "Wechselhaft";
    const note = rainChance >= 40
      ? `${rainChance}% Regenwahrscheinlichkeit gerade – Schirm einpacken`
      : `${rainChance}% Regenwahrscheinlichkeit gerade`;

    el.innerHTML = `
      <div class="icon-btn" style="background:var(--accent-blue);cursor:default;">${weatherIconSVG(code)}</div>
      <div>
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em;">${temp}° · ${label}</div>
        <div style="font-size:13px;color:var(--accent-blue);font-weight:500;margin-top:2px;">${note}</div>
      </div>`;
  } catch (e) {
    el.innerHTML = `<div class="empty-state">Wetter konnte nicht geladen werden – prüf deine Internetverbindung.</div>`;
  }
}

const UMBRELLA_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9Z"></path><path d="M12 12v7a2 2 0 0 1-2 2"></path><path d="M12 3v2"></path></svg>';

async function loadHourlyWeather(topId, hourlyId) {
  const topEl = document.getElementById(topId);
  const hourlyEl = document.getElementById(hourlyId);
  topEl.innerHTML = `<div class="empty-state">Wetter wird geladen …</div>`;

  try {
    const pos = await getPosition();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat}&longitude=${pos.lon}` +
      `&current=temperature_2m,weather_code,precipitation_probability` +
      `&hourly=temperature_2m,precipitation_probability,weather_code` +
      `&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    const data = await res.json();

    const nowHour = new Date().getHours();
    const curTemp = Math.round(data.current.temperature_2m);
    const curCode = data.current.weather_code;
    const curLabel = WEATHER_CODE_LABELS[curCode] || "Wechselhaft";
    const hi = Math.round(data.daily.temperature_2m_max[0]);
    const lo = Math.round(data.daily.temperature_2m_min[0]);

    const upcoming = data.hourly.precipitation_probability.slice(nowHour, nowHour + 12);
    const maxRain = upcoming.length ? Math.max(...upcoming) : 0;
    let advice;
    if (maxRain >= 60) advice = `Heute wahrscheinlich Regen (bis zu ${maxRain}%) – Schirm einpacken.`;
    else if (maxRain >= 30) advice = `Vereinzelt Regen möglich (bis zu ${maxRain}%) – Schirm sicherheitshalber dabei.`;
    else advice = "Kein nennenswerter Regen erwartet – Schirm kann zuhause bleiben.";

    topEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:16px;">
        <div class="icon-btn" style="width:60px;height:60px;background:var(--accent-blue);cursor:default;">${weatherIconSVG(curCode)}</div>
        <div>
          <div style="font-size:34px;font-weight:700;letter-spacing:-0.02em;">${curTemp}°</div>
          <div class="secondary" style="font-size:14px;margin-top:-2px;">${curLabel} · H:${hi}° T:${lo}°</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--icon-tile-bg);color:var(--accent-blue);">
        ${UMBRELLA_ICON}
        <div style="font-size:13.5px;font-weight:500;">${advice}</div>
      </div>`;

    const hourly = data.hourly.time.map((t, i) => ({
      hour: new Date(t).getHours(),
      temp: Math.round(data.hourly.temperature_2m[i]),
      rain: data.hourly.precipitation_probability[i],
      code: data.hourly.weather_code[i]
    })).filter((h) => h.hour >= nowHour);

    hourlyEl.innerHTML = hourly.map((h, i) => `
      <div style="flex:none;display:flex;flex-direction:column;align-items:center;gap:6px;min-width:52px;">
        <div class="secondary" style="font-size:12px;">${i === 0 ? "Jetzt" : String(h.hour).padStart(2, "0") + " Uhr"}</div>
        <div style="color:var(--accent-blue);">${weatherIconSVG(h.code).replace(/width="24" height="24"/, 'width="20" height="20"').replace(/stroke="#FFFFFF"/, 'stroke="currentColor"')}</div>
        <div style="font-size:11px;font-weight:600;color:${h.rain >= 30 ? "var(--accent-blue)" : "var(--text-secondary)"};">${h.rain}%</div>
        <div style="font-weight:600;font-size:14px;">${h.temp}°</div>
      </div>`).join("");
  } catch (e) {
    topEl.innerHTML = `<div class="empty-state">Wetter konnte nicht geladen werden – prüf deine Internetverbindung.</div>`;
    hourlyEl.innerHTML = "";
  }
}
