// Geräte-ID des Admins (Angel) — nur dieses Gerät sieht die Liste offener
// Zugangs-Anfragen und kann sie bestätigen/ablehnen. Siehe README.md unter
// "Zugangs-Anfragen einrichten" dafür, wie du deine eigene ID findest.
// Diese ID ist nicht geheim (kein Passwort, nur ein zufälliger Anmelde-Bezeichner),
// der eigentliche Schutz läuft über die Firestore-Sicherheitsregeln, nicht über
// Geheimhaltung dieses Werts.
const ADMIN_UID = "ZCdlly38pvSgaKwYUmii4COldlbZ2";
