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

## Aktueller Stand (bereits gebaut, funktioniert)
- `index.html` — Home: Wetter-Kurzkarte (verlinkt zu wetter.html), Schnellzugriffe, Tagesübersicht
- `wetter.html` — voller Tagesverlauf (Stundenwerte, Regenwahrscheinlichkeit, Schirm-Hinweis)
- `unterwegs.html` + `js/bus.js` — findet echte nächste Bushaltestelle zum Live-Standort,
  zeigt nur direkte (umsteigefreie) Busse zur Schule oder Gastfamilie
- `naehe.html` + `js/places.js` — Restaurants/Läden live sortiert nach Standort
- `gruppe.html` + `js/group.js` — Distanz vom Live-Standort zu fest hinterlegten
  Mitschüler-Adressen (aktuell hartcodiert in group.js)
- `mehr.html` — Währungsrechner (live), Rückreise-Checkliste (localStorage), Platzhalter
  für Stundenplan/Sozialprogramm
- `notfall.html` — 999-Anruf-Button, Kontakte, Adressen; Telefonnummern etc. aktuell nur
  lokal im `localStorage` gespeichert (pro Gerät, nicht geteilt)
- `css/style.css` — gemeinsames Design: hell/dunkel automatisch über
  `prefers-color-scheme`, Apple-artige Optik (Systemschrift, Farbverläufe vermeiden,
  Karten mit Schatten statt Rahmen, Akzentfarbe `#0071E3`)
- `sw.js` — einfacher Service Worker fürs Offline-Caching der Seiten-Hülle

## Nächste Schritte (das will Angel jetzt umsetzen)

Wichtige Änderung: dafür wird zum ersten Mal eine **zentrale Datenbank** gebraucht
(bisher lief alles nur lokal pro Handy). Empfehlung: **Firebase**, kostenlose
"Spark"-Stufe, keine Kreditkarte nötig. Alternative wäre Supabase (auch kostenlos),
aber Firebase hat die einfachere Anbindung für reines Frontend ohne eigenen Server.

1. **Selbst eintragbare Kontakte/Adressen**: jeder Schüler soll seine eigene
   Gastfamilien-Adresse und Notfallkontakte eintragen können (nicht alle haben die
   gleiche Gastfamilie wie Angel). Muss zentral gespeichert werden (Firebase), damit
   alle in der Gruppe die Liste sehen — nicht mehr nur lokal wie aktuell in `notfall.html`.

2. **Live-Standort-Übersicht ("Snap Map"-Stil)**: eine Karte, auf der man sieht, wer
   von der Gruppe gerade wo ist — nur wenn diese Person das aktiv erlaubt hat.
   Wichtige Einschränkung, die Angel schon kennt: Standort aktualisiert sich nur,
   solange die App bei der jeweiligen Person offen ist (kein Hintergrund-Tracking,
   das geht bei einer Web-App ohne Weiteres technisch nicht). Braucht:
   - Firebase für die aktuellen Positionen
   - Leaflet + OpenStreetMap-Kacheln für die Kartenansicht (kostenlos, kein
     Google-Maps-Konto nötig)
   - einen klaren, jederzeit widerrufbaren Ein/Aus-Schalter pro Person — das ist
     nicht optional, sondern Voraussetzung, bevor das Feature live geht

3. **Profilbilder**: einfachste kostenlose Umsetzung — Bild im Browser vor dem
   Hochladen auf z. B. 200×200px verkleinern (Canvas API) und zusammen mit den
   restlichen Daten in Firebase speichern. Kein separater Speicherdienst nötig.

## Vorgehen
Bitte vor dem Loslegen kurz einen Plan vorschlagen (Datenstruktur in Firebase,
welche Screens sich ändern), dann umsetzen. Änderungen committen und pushen,
ohne bei jedem einzelnen Schritt nachzufragen — Angel hat das ausdrücklich erlaubt.
