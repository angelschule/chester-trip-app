# Chester Sprachaufenthalt App

Eine kleine PWA (installierbare Web-App) für den Sprachaufenthalt in Chester.
Läuft komplett im Browser, kein Server, keine Kosten.

## Was ist echt / live, was ist Beispieldaten?

| Screen | Status |
|---|---|
| Wetter (Home) | **Live** – Open-Meteo, basierend auf deinem aktuellen Standort |
| Wetter-Detailseite | **Live** – Stundenverlauf für heute (Temperatur, Regenwahrscheinlichkeit) plus Regenschirm-Hinweis, erreichbar per Tap auf die Wetterkarte auf Home |
| In der Nähe | **Live** – OpenStreetMap, sortiert nach deiner echten Entfernung |
| Gruppe | **Live-Distanz** zu allen Gastfamilien-Adressen (aus Firestore, siehe unten), plus **Live-Standortkarte** der Gruppe (opt-in, siehe unten) — beides nur für bestätigte Personen sichtbar |
| Unterwegs / Busse | **Echte Chester-Haltestellen & echter Fahrplan** (UK Bus Open Data Service), findet die nächste Haltestelle zu deinem Live-Standort und zeigt nur direkte Busse (ohne Umsteigen) zur Schule bzw. Gastfamilie. **Keine Live-GPS-Position** des Busses selbst (siehe unten) |
| Stundenplan / Sozialprogramm | Platzhalter, noch einzutragen |
| Währungsrechner | **Live** – Frankfurter.app (Wechselkurs der EZB) |
| Checkliste, Versicherungsdaten | Werden lokal auf deinem Gerät gespeichert (`localStorage`), nirgendwo hochgeladen |
| Notfall-Kontakte (Name, Gastfamilie, Betreuung, Profilbild) | **Live, geteilt** – zentral in Firebase gespeichert, jede Person sieht die Einträge der ganzen Gruppe (siehe Abschnitt "Firebase einrichten" unten). Profilbilder werden vor dem Hochladen im Browser auf 200×200px verkleinert |
| Live-Standortkarte (Gruppe) | **Live, opt-in** – nur Personen, die den Schalter aktiv eingeschaltet haben, sind sichtbar; Standort wird alle ~45s aktualisiert, nur solange die App offen ist. Zeigt den letzten bekannten Standort mit Zeitangabe (z. B. "vor 12 Min"), Marker werden grau statt lila sobald sie seit über 2 Min nicht mehr aktualisiert wurden. Beim Ausschalten wird der Eintrag sofort gelöscht (Leaflet + OpenStreetMap-Kacheln, kostenlos, kein Google-Maps-Konto) |

### Wie die Busdaten funktionieren

`js/chester-stops.json` (alle Haltestellen rund um Chester) und `js/chester-bus-connections.json`
(welche Linien von welcher Haltestelle direkt zu Chester Northgate bzw. Stamford Road/Blacon fahren,
mit echten Abfahrtszeiten) wurden einmalig aus dem offiziellen GTFS-Fahrplan des UK Bus Open Data
Service für Nordwest-England erzeugt – Snapshot vom 18.09.2026. Das bedeutet:

- Die App findet beim Öffnen die **echte, nächste Haltestelle zu deinem aktuellen Standort** und zeigt nur Busse, die **ohne Umsteigen** zum jeweils gewählten Ziel fahren.
- **Einschränkung:** nur direkte Verbindungen werden erkannt – wenn du irgendwo bist, wo man umsteigen müsste, sagt die App "kein direkter Bus von hier", auch wenn es mit Umsteigen ginge.
- **Einschränkung:** der Fahrplan-Snapshot berücksichtigt reguläre Wochentags-/Wochenend-Muster, aber keine kurzfristigen Ausnahmen (Feiertage, Umleitungen). Für ganz aktuelle Änderungen im Zweifel bei [Traveline](https://www.traveline.info) nachschauen.
- Falls sich der Fahrplan über die Zeit ändert, können die beiden JSON-Dateien bei Bedarf neu erzeugt werden (sag mir Bescheid, dann mache ich das).

## Firebase einrichten (für geteilte Notfallkontakte & Live-Standort)

Damit die ganze Gruppe die Kontakte/Adressen sehen kann (`notfall.html`) und die
Live-Standortkarte funktioniert (`gruppe.html`), braucht die App ein Firebase-Projekt.
Kostenlose "Spark"-Stufe, keine Kreditkarte nötig, einmalig einzurichten:

1. [console.firebase.google.com](https://console.firebase.google.com) → **Projekt hinzufügen** → Namen vergeben (z. B. `chester-trip-app`).
2. **Projekteinstellungen** (Zahnrad oben links) → Reiter **Allgemein** → ganz unten bei
   "Meine Apps" auf das Web-Symbol (`</>`) klicken → App registrieren (Firebase Hosting
   überspringen, wird nicht gebraucht). Der angezeigte `firebaseConfig`-Block sind genau
   die Werte für `js/firebase-config.js`.
3. **Authentication** (linkes Menü) → "Erste Schritte" → Anbieter **Anonym** aktivieren.
   Dadurch bekommt jedes Gerät eine feste ID, ohne dass sich jemand mit Passwort anmelden muss.
4. **Firestore Database** (linkes Menü) → **Datenbank erstellen** → Produktionsmodus,
   Standort z. B. `europe-west`.
5. Die 6 Werte aus Schritt 2 in `js/firebase-config.js` eintragen, committen & pushen.
6. **Deine eigene Geräte-ID finden**, um dich als Admin einzutragen: App öffnen (z. B.
   lokal, siehe unten, oder schon live auf GitHub Pages) → Tab **Mehr** öffnen → ganz
   unten steht "Geräte-ID: …". Dieser Wert steht bereits in `js/admin-config.js` bei
   `ADMIN_UID` (`ZCdlly38pvSgaKwYUmi4COldlbZ2`) — nur dieses Gerät sieht danach die
   Liste offener Zugangs-Anfragen und kann sie bestätigen/ablehnen. Falls du die App
   mal auf einem anderen Gerät als Admin nutzen willst, hier bzw. mit mir aktualisieren.
7. Im Firestore-Reiter **Regeln** den folgenden Text einfügen (Admin-UID ist schon
   eingetragen) und veröffentlichen:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       function isAdmin() {
         return request.auth != null && request.auth.uid == "ZCdlly38pvSgaKwYUmi4COldlbZ2";
       }

       function isApproved() {
         return request.auth != null &&
           exists(/databases/$(database)/documents/contacts/$(request.auth.uid)) &&
           get(/databases/$(database)/documents/contacts/$(request.auth.uid)).data.get('status', null) == 'approved';
       }

       match /contacts/{userId} {
         allow read: if request.auth != null && (
           request.auth.uid == userId || isAdmin() || isApproved()
         );

         allow create: if request.auth != null && request.auth.uid == userId &&
           (!('status' in request.resource.data) || request.resource.data.status == 'pending');

         allow update: if isAdmin() || (
           request.auth != null && request.auth.uid == userId && (
             request.resource.data.get('status', null) == resource.data.get('status', null) ||
             (resource.data.get('status', null) in [null, 'denied'] &&
               request.resource.data.get('status', null) == 'pending')
           )
         );

         allow delete: if isAdmin() || (request.auth != null && request.auth.uid == userId);
       }

       match /locations/{userId} {
         allow read: if isAdmin() || isApproved();
         allow write: if request.auth != null && request.auth.uid == userId && (isAdmin() || isApproved());
         allow delete: if request.auth != null && request.auth.uid == userId;
       }

       match /roster/{docId} {
         allow get: if request.auth != null;
         allow list: if isAdmin() || isApproved();
         allow write: if isAdmin();
       }
     }
   }
   ```

   `roster` enthält die vorbefüllten Gastfamilien-Daten aus der Excel-Liste (Name →
   Gastfamilie/Adresse), damit beim ersten Eintragen des eigenen Namens automatisch die
   passende Gastfamilie erkannt wird. `get` (einzelnen Eintrag nach Namen nachschlagen)
   ist für jeden offen — das braucht man schon *vor* der Bestätigung. `list` (die ganze
   Liste auf einmal) nur für Admin/bestätigte Personen. Schreiben kann nur das
   Admin-Gerät (zum einmaligen Befüllen/Aktualisieren der Liste).

   Das bedeutet: jede Person kann **immer ihren eigenen** Kontakt-Eintrag lesen/anlegen
   (um ihren eigenen Anfrage-Status zu sehen), aber die Kontakte/Standorte der **ganzen
   Gruppe** sieht nur, wer entweder das Admin-Gerät ist oder bereits bestätigt
   (`status: "approved"`) wurde. Den eigenen Status auf `"approved"` setzen kann nur
   das Admin-Gerät — eine Person kann sich also nicht selbst freischalten, auch nicht
   über die Browser-Konsole.

Diese Werte (Firebase-Config und Admin-UID) sind nicht geheim – sie identifizieren nur
das Projekt bzw. ein Gerät. Der eigentliche Schutz läuft über die Sicherheitsregeln
oben, nicht über Geheimhaltung dieser Werte.

### Wie die Zugangs-Freigabe funktioniert

1. Eine neue Person öffnet die App, trägt unter **Notfall → Mein Name** ihren Namen ein
   und tippt auf **"Zugang anfragen"**.
2. Auf deinem (Admin-)Gerät erscheint die Anfrage oben auf der Notfall-Seite unter
   "Offene Anfragen" — du tippst auf ✓ (erlauben) oder ✕ (ablehnen). Das siehst du
   erst, wenn du die App selbst öffnest — eine echte Push-Benachrichtigung wäre nur
   mit einer kostenpflichtigen Firebase-Stufe möglich (siehe Absage dazu im Chat).
3. Erst nach deiner Bestätigung sieht diese Person die Kontakte der Gruppe und die
   Live-Standortkarte. Bei Ablehnung kann sie es erneut versuchen.

### Wie der Namens-Abgleich funktioniert

Beim Eintragen des eigenen Namens wird automatisch mit der Firestore-Collection
`roster` abgeglichen (Groß-/Kleinschreibung und Leerzeichen spielen keine Rolle).
Bei einem Treffer werden Gastfamilie-Name, -Adresse und -Telefon automatisch
eingetragen — aber **nur leere Felder**, eigene Korrekturen werden nie überschrieben.
`roster` wurde einmalig von Claude aus Angels Excel-Liste befüllt (24 Personen, über
Nominatim/OpenStreetMap geokodiert) — die Rohdaten liegen bewusst **nicht** im
Git-Repo, sondern nur in Firestore, weil `js/group.js` sonst eine öffentlich
abrufbare Datei mit echten Namen/Adressen Minderjähriger wäre. Falls sich die Liste
ändert (neue Person, andere Gastfamilie), sag mir Bescheid, dann trage ich das direkt
in Firestore nach (kein erneutes Firestore-Regel-Gefrickel nötig, solange die
`roster`-Regeln aus Schritt 7 oben bereits stehen).

## 1. Auf GitHub Pages veröffentlichen (kostenlos)

1. Alle Dateien aus diesem Ordner in dein Repository hochladen (Struktur beibehalten: `css/`, `js/`, `icons/` bleiben Unterordner).
2. Im Repo: **Settings → Pages → Source: Deploy from a branch → Branch: main → Save**.
3. Nach ca. 1 Minute ist die App unter `https://<dein-github-name>.github.io/<repo-name>/` erreichbar.
4. Auf dem iPhone in **Safari** öffnen → Teilen-Symbol → **Zum Home-Bildschirm**.

Wichtig: Safari muss verwendet werden (nicht Chrome/Firefox auf iOS) und die Seite muss über `https://` laufen – Standortabfrage funktioniert sonst nicht.

## 2. Was du noch selbst eintragen solltest

- **`index.html`** und **`mehr.html`**: Stundenplan und Sozialprogramm, sobald du sie von der Schule hast (im Text markiert mit "Noch nicht hinterlegt").
- **`js/firebase-config.js`**: siehe Abschnitt "Firebase einrichten" oben – ohne diese Werte funktionieren die geteilten Notfallkontakte nicht (Versicherungsdaten bleiben aber immer lokal).
- **`notfall.html`**: Name, Profilbild, Gastfamilie und Betreuung trägt jede Person direkt in der App ein (wird geteilt, bei bekanntem Namen automatisch mit Gastfamilie vorausgefüllt); Versicherungsdaten trägst du ebenfalls direkt ein, bleiben aber nur lokal gespeichert.
- **Roster-Liste (Firestore, nicht im Repo)**: falls sich Namen/Adressen deiner Mitschüler ändern, sag mir Bescheid — ich trage das direkt in Firestore nach.

## 3. Grenzen, die du kennen solltest

- **Kein echtes Live-GPS-Tracking der Busse.** Der UK Bus Open Data Service bietet das zwar kostenlos an, aber nur über einen Server-Proxy (Browser kann die Rohdaten aus CORS-Gründen nicht direkt lesen). Das wäre eine mögliche Erweiterung über z. B. Cloudflare Pages Functions (ebenfalls kostenlos) – sag Bescheid, falls gewünscht.
- **Standort nur bei geöffneter App.** Als reine Web-App gibt es kein Hintergrund-Tracking; die Seite muss offen sein, um deinen Standort zu aktualisieren. Die Live-Standortkarte in `gruppe.html` zeigt trotzdem den letzten bekannten Standort mit Zeitangabe an (statt ihn zu verstecken), markiert ihn aber grau statt lila, sobald er seit über 2 Minuten nicht mehr aktualisiert wurde, damit klar bleibt, was live ist und was nicht.
- **OpenStreetMap-Daten** sind community-gepflegt und nicht überall so vollständig wie Google Maps – meistens aber gut genug für Restaurants/Läden in Wohngebieten.

## 4. Lokal testen (optional)

Da die App `fetch()` und Geolocation nutzt, reicht Doppelklick auf `index.html` nicht ganz aus – am einfachsten:

```
cd chester-trip-app
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen.
