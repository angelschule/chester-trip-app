// Currency converter — Frankfurter.app is a free, key-less exchange rate API
// backed by the European Central Bank. Rates are fetched once per page load.

let currentRates = { EUR: 1.16, CHF: 1.09 }; // fallback shown until the real rates arrive

async function loadRates() {
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=GBP&to=EUR,CHF");
    const data = await res.json();
    currentRates = data.rates;
    document.getElementById("rate-note").textContent = "Kurs vom " + data.date + " (Europäische Zentralbank)";
  } catch (e) {
    document.getElementById("rate-note").textContent = "Live-Kurs nicht verfügbar – zeige Schätzwert.";
  }
  updateConversion();
}

function updateConversion() {
  const amount = parseFloat(document.getElementById("gbpInput").value) || 0;
  document.getElementById("eur-out").textContent = (amount * currentRates.EUR).toFixed(2);
  document.getElementById("chf-out").textContent = (amount * currentRates.CHF).toFixed(2);
}
