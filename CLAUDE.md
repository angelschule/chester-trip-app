# Chester Sprachaufenthalt App — Projektkontext für Claude Code

## Was das ist
Eine kleine PWA (installierbare Web-App) für Angels Sprachaufenthalt in Chester.
Aktuell: reines HTML/CSS/JS, kein Build-Tool, gehostet kostenlos über GitHub Pages
unter https://angelschule.github.io/chester-trip-app/

## Harte Regel: kein Geld ausgeben
Alle Dienste müssen auf einem kostenlosen Tier laufen, ohne hinterlegte Zahlungsmethode.
Bereits verwendet, alles kostenlos & ohne Account-Zwang:
- Open-Meteo (Wetter)
- OpenStreetMap / Overpass API (Läden & Restaurants in der Nähe)
- Frankfurter.app (Wechselkurse)
- UK Bus Open Data Service / GTFS (echte Chester-Bushaltestellen & Fahrplan,
  vorverarbeitet in js/chester-stops.json und js/chester-bus-connections.json)
- GitHub Pages (Hosting)
- Firebase, kostenlose "Spark"-Stufe (Firestore + Anonymous Auth) — seit Feature 1
  im Einsatz für geteilte Notfallkontakte, Config in js/firebase-config.js, Setup
  in README.md unter "Firebase einrichten"

## Aktueller Stand (bereits gebaut, funktioniert)
- `index.html` — Home: Wetter-Kurzkarte (verlinkt zu wetter.html), Schnellzugriffe, Tagesübersicht
- `wetter.html` — voller Tagesverlauf (Stundenwerte, Regenwahrscheinlichkeit, Schirm-Hinweis)
- `unterwegs.html` + `js/bus.js` — findet echte nächste Bushaltestelle zum Live-Standort,
  zeigt nur direkte (umsteigefreie) Busse zur Schule oder Gastfamilie
- `naehe.html` + `js/places.js` — Restaurants/Läden live sortiert nach Standort
- `gruppe.html` + `js/group.js` — Distanz vom Live-Standort zu fest hinterlegten
  Mitschüler-Adressen (aktuell hartcodiert in group.js), PLUS `js/livemap.js`:
  Live-Standortkarte der Gruppe (Leaflet + OSM), rein opt-in über einen Ein/Aus-Schalter,
  aktualisiert nur solange die App offen ist, Positionen älter als 15 Min werden
  ausgeblendet, beim Ausschalten wird der Firestore-Eintrag sofort gelöscht
- `mehr.html` — Währungsrechner (live), Rückreise-Checkliste (localStorage), Platzhalter
  für Stundenplan/Sozialprogramm
- `notfall.html` + `js/contacts.js` — 999-Anruf-Button, Kontakte, Adressen. Name,
  Gastfamilie (Name/Adresse/Telefon) und Betreuung sind jetzt zentral in Firebase
  gespeichert und für die ganze Gruppe sichtbar (nicht mehr nur pro Gerät). Nur die
  Versicherungsdaten bleiben bewusst lokal im `localStorage` (sensibler, nicht
  gruppenrelevant) — siehe `js/notfall.js`
- `css/style.css` — gemeinsames Design: hell/dunkel automatisch über
  `prefers-color-scheme`, Apple-artige Optik (Systemschrift, Farbverläufe vermeiden,
  Karten mit Schatten statt Rahmen, Akzentfarbe `#0071E3`)
- `sw.js` — einfacher Service Worker fürs Offline-Caching der Seiten-Hülle

## Nächste Schritte (das will Angel jetzt umsetzen)

Firebase (kostenlose "Spark"-Stufe, keine Kreditkarte nötig) ist seit Feature 1 im
Einsatz — Setup siehe README.md, Config in `js/firebase-config.js`.

**Erledigt:** Feature 1 (selbst eintragbare Kontakte/Adressen) — siehe `notfall.html` +
`js/contacts.js`. Feature 2 (Live-Standort-Übersicht) — siehe `gruppe.html` +
`js/livemap.js`, Ein/Aus-Schalter standardmässig aus, jederzeit widerrufbar (löscht den
Firestore-Eintrag sofort), Positionen älter als 15 Min werden ausgeblendet.

Offen: die Firestore-Sicherheitsregeln in der Konsole müssen noch um die
`locations`-Collection erweitert werden (Angel macht das selbst, Regeltext steht in
README.md unter "Firebase einrichten").

Noch offen:

1. **Profilbilder**: einfachste kostenlose Umsetzung — Bild im Browser vor dem
   Hochladen auf z. B. 200×200px verkleinern (Canvas API) und zusammen mit den
   restlichen Daten in Firebase speichern. Kein separater Speicherdienst nötig.

## Vorgehen
Bitte vor dem Loslegen kurz einen Plan vorschlagen (Datenstruktur in Firebase,
welche Screens sich ändern), dann umsetzen. Änderungen committen und pushen,
ohne bei jedem einzelnen Schritt nachzufragen — Angel hat das ausdrücklich erlaubt.
