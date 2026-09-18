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
- `gruppe.html` + `js/group.js` — Distanz vom Live-Standort zu fest hinterlegten
  Mitschüler-Adressen (aktuell hartcodiert in group.js), PLUS `js/livemap.js`:
  Live-Standortkarte der Gruppe (Leaflet + OSM), rein opt-in über einen Ein/Aus-Schalter,
  aktualisiert nur solange die App offen ist. Zeigt den letzten bekannten Standort mit
  Zeitangabe (z. B. "vor 12 Min") statt ihn zu verstecken, Marker werden grau statt lila
  sobald über 2 Min alt. Beim Ausschalten wird der Firestore-Eintrag sofort gelöscht
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
  (`gruppe.html`, ebenfalls hinter derselben Freigabe)
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
`notfall.html`/`js/admin-config.js`.

Alle ursprünglich geplanten Features sind damit umgesetzt.

Offen:
- Die Firestore-Sicherheitsregeln in der Konsole müssen noch mit dem AKTUELLEN
  Regeltext aus README.md ersetzt werden (enthält jetzt auch die Zugangs-Freigabe-Logik
  für Feature 4 — der alte Regeltext ohne isAdmin()/isApproved() reicht nicht mehr aus).
- `js/admin-config.js` braucht noch Angels echte ADMIN_UID (siehe README.md,
  "Deine eigene Geräte-ID finden").
- **Mitschüler-Adressliste (`js/group.js`):** Angel hat eine echte Namensliste mit
  Gastfamilien-Adressen alle 24 Personen geliefert (Vor-/Nachname, Host, Adresse,
  Postleitzahl — inkl. 2 erwachsener Betreuungspersonen). Alle Adressen wurden bereits
  einmalig über Nominatim/OpenStreetMap geokodiert. ABER: das direkte Einbauen in
  `js/group.js` wurde von der Auto-Mode-Sicherheitsprüfung blockiert ("Out-of-Place
  Publication") — zu Recht, denn `js/group.js` ist eine statische Datei, die unabhängig
  von jeder App-internen Zugangs-Freigabe direkt über die GitHub-Pages-URL abrufbar
  wäre (keine Firestore-Regeln greifen dort). Für 24 echte Namen Minderjähriger +
  Wohnadressen ist das nicht ausreichend geschützt. Empfehlung für den nächsten
  Schritt: die Roster-Daten stattdessen in Firestore (`contacts`-Collection)
  vorbefüllen statt in eine öffentliche JS-Datei zu schreiben, damit dieselben
  Sicherheitsregeln greifen wie beim Rest der Gruppendaten. Noch nicht umgesetzt —
  mit Angel abzustimmen, bevor das passiert.

## Vorgehen
Bitte vor dem Loslegen kurz einen Plan vorschlagen (Datenstruktur in Firebase,
welche Screens sich ändern), dann umsetzen. Änderungen committen und pushen,
ohne bei jedem einzelnen Schritt nachzufragen — Angel hat das ausdrücklich erlaubt.
