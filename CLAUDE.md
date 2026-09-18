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
  in README.md unter "Firebase einrichten". Echte Push-Benachrichtigungen (z. B. für
  Zugangs-Anfragen) würden Cloud Functions + die kostenpflichtige "Blaze"-Stufe
  brauchen (Zahlungsmethode nötig) — deshalb bewusst NICHT eingebaut, siehe Feature 4

## Aktueller Stand (bereits gebaut, funktioniert)
- `index.html` — Home: Wetter-Kurzkarte (verlinkt zu wetter.html), Schnellzugriffe, Tagesübersicht
- `wetter.html` — voller Tagesverlauf (Stundenwerte, Regenwahrscheinlichkeit, Schirm-Hinweis)
- `unterwegs.html` + `js/bus.js` — findet echte nächste Bushaltestelle zum Live-Standort,
  zeigt nur direkte (umsteigefreie) Busse zur Schule oder Gastfamilie
- `naehe.html` + `js/places.js` — Restaurants/Läden live sortiert nach Standort
- `gruppe.html` + `js/group.js` — Distanz vom Live-Standort zu jedem Gastfamilien-
  Haushalt aus der Firestore-Collection `roster` (einmalig aus der Excel-Liste der
  Schule befüllt, Adressen über Nominatim/OpenStreetMap geokodiert — siehe
  README.md "Wie die Zugangs-Freigabe funktioniert" / roster-Regeln). Kein
  hartcodiertes JS mehr, da `js/group.js` sonst eine öffentlich abrufbare Datei mit
  echten Namen/Adressen Minderjähriger wäre. Nur für bestätigte Personen sichtbar
  (gleiche Zugangs-Freigabe wie der Rest). PLUS `js/livemap.js`: Live-Standortkarte
  der Gruppe (Leaflet + OSM), rein opt-in über einen Ein/Aus-Schalter, aktualisiert
  nur solange die App offen ist. Zeigt den letzten bekannten Standort mit Zeitangabe
  (z. B. "vor 12 Min") statt ihn zu verstecken, Marker werden grau statt lila sobald
  über 2 Min alt. Beim Ausschalten wird der Firestore-Eintrag sofort gelöscht
- `mehr.html` — Währungsrechner (live), Rückreise-Checkliste (localStorage), Platzhalter
  für Stundenplan/Sozialprogramm
- `notfall.html` + `js/contacts.js` — 999-Anruf-Button, Kontakte, Adressen. Name,
  Profilbild, Gastfamilie (Name/Adresse/Telefon) und Betreuung sind jetzt zentral in
  Firebase gespeichert und für die ganze Gruppe sichtbar (nicht mehr nur pro Gerät).
  Profilbilder werden im Browser vor dem Hochladen auf 200×200px verkleinert (Canvas
  API) und als Data-URL im selben Kontakt-Dokument gespeichert — kein separater
  Speicherdienst nötig. Nur die Versicherungsdaten bleiben bewusst lokal im
  `localStorage` (sensibler, nicht gruppenrelevant) — siehe `js/notfall.js`.
  Zugangs-Freigabe (Feature 4): neue Personen tragen ihren Namen ein und tippen auf
  "Zugang anfragen" (status:"pending"); nur das Admin-Gerät (`js/admin-config.js`,
  `ADMIN_UID`) sieht die Liste offener Anfragen (oben auf `notfall.html`) und kann
  bestätigen/ablehnen. Wird nicht nur im UI versteckt, sondern in den
  Firestore-Sicherheitsregeln selbst erzwungen (README.md) — eine Person kann sich
  nicht selbst freischalten, auch nicht über die Browser-Konsole. Solange nicht
  bestätigt, sieht man weder die Gruppen-Kontakte noch die Live-Standortkarte
  (`gruppe.html`, ebenfalls hinter derselben Freigabe). Name-Abgleich (Feature 5):
  beim Eintragen des eigenen Namens wird gegen die Firestore-Collection `roster`
  abgeglichen (`normalizeName()` in `js/contacts.js`) — bei Treffer werden
  Gastfamilie-Name/Adresse/Telefon automatisch ausgefüllt (nur leere Felder, nie
  eigene Korrekturen überschreiben)
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
Firestore-Eintrag sofort), letzter bekannter Standort bleibt mit Zeitangabe sichtbar
statt zu verschwinden (grau statt lila sobald über 2 Min alt). Feature 3 (Profilbilder)
— siehe `notfall.html` + `js/contacts.js`, Bild wird im Browser auf 200×200px
verkleinert und im selben Kontakt-Dokument gespeichert; erscheint als Avatar in der
Gruppen-Kontaktliste (`notfall.html`) und auf der Live-Standortkarte (`gruppe.html`).
Feature 4 (Zugangs-Freigabe, nachträglich von Angel gewünscht) — siehe oben unter
`notfall.html`/`js/admin-config.js`, Firestore-Regeln inkl. isAdmin()/isApproved()
sind live und getestet (inkl. eines Bugfixes: `resource.data.status` wirft in
Firestore-Regeln einen Fehler statt `undefined` zurückzugeben, wenn das Feld fehlt —
jetzt überall `.get('status', null)` statt direktem Property-Zugriff). Feature 5
(Namens-Abgleich, ebenfalls nachträglich gewünscht) — `js/contacts.js`
(`handleNameChange`/`normalizeName`) plus die Firestore-Collection `roster` (24
Personen aus Angels Excel-Liste, einmalig geokodiert und per Skript eingetragen,
nicht im Git-Repo). `js/group.js` liest "Wohnen in deiner Nähe" jetzt live aus
`roster` statt aus hartcodierten Daten.

Alle bisher gewünschten Features sind damit umgesetzt und Ende-zu-Ende getestet
(inkl. serverseitiger Durchsetzung der Zugangs-Freigabe, nicht nur UI-Versteck).

Offen:
- Ein Test-Kontakt "Test Schueler" von Claudes eigenem Testen ist noch in der
  `contacts`-Collection und sollte von Angel gelöscht werden.

## Vorgehen
Bitte vor dem Loslegen kurz einen Plan vorschlagen (Datenstruktur in Firebase,
welche Screens sich ändern), dann umsetzen. Änderungen committen und pushen,
ohne bei jedem einzelnen Schritt nachzufragen — Angel hat das ausdrücklich erlaubt.
