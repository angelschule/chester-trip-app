// Firebase-Projekt-Konfiguration.
//
// So bekommst du diese Werte (einmalig, kostenlose "Spark"-Stufe, keine Kreditkarte nötig):
// 1. console.firebase.google.com → "Projekt hinzufügen" → Namen vergeben (z. B. "chester-trip-app").
// 2. Im Projekt: Zahnrad oben links → "Projekteinstellungen" → Reiter "Allgemein" →
//    ganz unten bei "Meine Apps" auf das Web-Symbol (</>) klicken → App registrieren
//    (Firebase Hosting NICHT nötig, einfach überspringen).
// 3. Der angezeigte "firebaseConfig"-Block sind genau die Werte hier unten.
// 4. Authentication (linkes Menü) → "Erste Schritte" → Anbieter "Anonym" aktivieren.
// 5. Firestore Database (linkes Menü) → "Datenbank erstellen" → Produktionsmodus,
//    Standort z. B. europe-west → dann in Firestore unter "Regeln" den Inhalt aus
//    README.md ("Firestore-Sicherheitsregeln") einfügen und veröffentlichen.
//
// Diese Werte hier sind NICHT geheim (sie identifizieren nur das Projekt, keine
// Zugangsdaten) – der eigentliche Schutz läuft über die Firestore-Sicherheitsregeln.
const firebaseConfig = {
  apiKey: "AIzaSyAqgB4T_yJh3PW-v1fBRd0fEeIr75uQ0G8",
  authDomain: "chester-trip-app.firebaseapp.com",
  projectId: "chester-trip-app",
  storageBucket: "chester-trip-app.firebasestorage.app",
  messagingSenderId: "235406995126",
  appId: "1:235406995126:web:b9cf1acd7985ac57798017"
};
