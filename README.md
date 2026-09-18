# Chester Sprachaufenthalt App

Eine kleine PWA (installierbare Web-App) für den Sprachaufenthalt in Chester.
Läuft komplett im Browser, kein Server, keine Kosten.

## Was ist echt / live, was ist Beispieldaten?

| Screen | Status |
|---|---|
| Wetter (Home) | **Live** – Open-Meteo, basierend auf deinem aktuellen Standort |
| Wetter-Detailseite | **Live** – Stundenverlauf für heute (Temperatur, Regenwahrscheinlichkeit) plus Regenschirm-Hinweis, erreichbar per Tap auf die Wetterkarte auf Home |
| In der Nähe | **Live** – OpenStreetMap, sortiert nach deiner echten Entfernung |
| Gruppe | **Live-Distanz**, aber feste Adressen (unten eintragbar) |
| Unterwegs / Busse | **Echte Chester-Haltestellen & echter Fahrplan** (UK Bus Open Data Service), findet die nächste Haltestelle zu deinem Live-Standort und zeigt nur direkte Busse (ohne Umsteigen) zur Schule bzw. Gastfamilie. **Keine Live-GPS-Position** des Busses selbst (siehe unten) |
| Stundenplan / Sozialprogramm | Platzhalter, noch einzutragen |
| Währungsrechner | **Live** – Frankfurter.app (Wechselkurs der EZB) |
| Checkliste, Notfall-Kontakte | Werden lokal auf deinem Gerät gespeichert (`localStorage`), nirgendwo hochgeladen |

### Wie die Busdaten funktionieren

`js/chester-stops.json` (alle Haltestellen rund um Chester) und `js/chester-bus-connections.json`
(welche Linien von welcher Haltestelle direkt zu Chester Northgate bzw. Stamford Road/Blacon fahren,
mit echten Abfahrtszeiten) wurden einmalig aus dem offiziellen GTFS-Fahrplan des UK Bus Open Data
Service für Nordwest-England erzeugt – Snapshot vom 18.09.2026. Das bedeutet:

- Die App findet beim Öffnen die **echte, nächste Haltestelle zu deinem aktuellen Standort** und zeigt nur Busse, die **ohne Umsteigen** zum jeweils gewählten Ziel fahren.
- **Einschränkung:** nur direkte Verbindungen werden erkannt – wenn du irgendwo bist, wo man umsteigen müsste, sagt die App "kein direkter Bus von hier", auch wenn es mit Umsteigen ginge.
- **Einschränkung:** der Fahrplan-Snapshot berücksichtigt reguläre Wochentags-/Wochenend-Muster, aber keine kurzfristigen Ausnahmen (Feiertage, Umleitungen). Für ganz aktuelle Änderungen im Zweifel bei [Traveline](https://www.traveline.info) nachschauen.
- Falls sich der Fahrplan über die Zeit ändert, können die beiden JSON-Dateien bei Bedarf neu erzeugt werden (sag mir Bescheid, dann mache ich das).

## 1. Auf GitHub Pages veröffentlichen (kostenlos)

1. Alle Dateien aus diesem Ordner in dein Repository hochladen (Struktur beibehalten: `css/`, `js/`, `icons/` bleiben Unterordner).
2. Im Repo: **Settings → Pages → Source: Deploy from a branch → Branch: main → Save**.
3. Nach ca. 1 Minute ist die App unter `https://<dein-github-name>.github.io/<repo-name>/` erreichbar.
4. Auf dem iPhone in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

Wichtig: Safari muss verwendet werden (nicht Chrome/Firefox auf iOS) und die Seite muss über `https://` laufen – Standortabfrage funktioniert sonst nicht.

## 2. Was du noch selbst eintragen solltest

- **`index.html`** und **`mehr.html`**: Stundenplan und Sozialprogramm, sobald du sie von der Schule hast (im Text markiert mit "Noch nicht hinterlegt").
- **`notfall.html`**: Telefonnummer der Gastfamilie, Name/Nummer der Reiseleitung, Versicherungsdaten – trägst du direkt in der App ein, wird lokal gespeichert.
- **`js/group.js`**: falls sich die Namen/Adressen deiner Mitschüler noch ändern.

## 3. Grenzen, die du kennen solltest

- **Kein echtes Live-GPS-Tracking der Busse.** Der UK Bus Open Data Service bietet das zwar kostenlos an, aber nur über einen Server-Proxy (Browser kann die Rohdaten aus CORS-Gründen nicht direkt lesen). Das wäre eine mögliche Erweiterung über z. B. Cloudflare Pages Functions (ebenfalls kostenlos) – sag Bescheid, falls gewünscht.
- **Standort nur bei geöffneter App.** Als reine Web-App gibt es kein Hintergrund-Tracking; die Seite muss offen sein, um deinen Standort zu aktualisieren.
- **OpenStreetMap-Daten** sind community-gepflegt und nicht überall so vollständig wie Google Maps – meistens aber gut genug für Restaurants/Läden in Wohngebieten.

## 4. Lokal testen (optional)

Da die App `fetch()` und Geolocation nutzt, reicht Doppelklick auf `index.html` nicht ganz aus – am einfachsten:

```
cd chester-trip-app
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.
