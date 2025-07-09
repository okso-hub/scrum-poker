![Agile Ace Logo](https://github.com/okso-hub/scrum-poker/blob/main/server/public/assets/images/agile-ace-high-resolution-logo.png)

# Dokumentation - User

## Projektbeschreibung
Scrum Poker (auch Planning Poker) ist eine Methode zur Aufwandsschätzung in agilen Teams. Jeder Teilnehmer erhält Karten mit Zahlenwerten (meist der Fibonacci-Reihe) und legt sie verdeckt für ein Backlog-Item aus. Anschließend werden die aufgedeckten Schätzungen besprochen, bis alle Beteiligten einen gemeinsamen Konsens über den geschätzten Aufwand erzielt haben. Durch die anonyme Schätzung werden Dominanzeffekte vermieden und realistischere Einschätzungen gefördert.
Die Ergebnisse können bspw. genutzt werden, um zu planen, welche Aufgaben realistisch betrachtet innerhalb des nächsten Sprints erledigt werden können.

Das vorliegende Projekt, welches im Rahmen der Vorlesung Webentwicklung & Verteilte Systeme entstanden ist, stellt eine Webanwendung dar, auf welcher agile Teams Scrum Poker spielen können.

## Setup
Die Anwendung kann im Browser unter http://141.72.13.151:8100/ aufgerufen werden, sofern man sich im Netzwerk der DHBW Mannheim befindet.

In `./server/public/*.html` muss die IP von `http://141.72.13.151:8100` bei lokaler Ausführung in den zu nutzenden HTML Dateien auf `http://localhost:3000` geändert werden.

Um die Anwendung lokal auf dem eigenen Rechner auszuführen, sind folgende Schritte erforderlich:
- git clone https://github.com/okso-hub/scrum-poker
- cd scrum-poker/server
- npm i
- npm run start:dev
- Die URL http://localhost:3000 im Browser aufrufen

## Beschreibung der Anwendung
### Startseite
Auf der Startseite muss der Benutzer seinen Namen eingeben. Anschließend kann er über Buttons ein neues Spiel starten (er wird zum Admin) oder einem existierenden Spiel mittels Angabe einer ID beitreten. Sofern der Nutzer über einen Link, welcher die GameID enthält, auf die Seite der Komponente gelangt ist, wird die GameID zum Betreten eines existierenden Spiels für den Nutzer automatisch eingetragen.

### Items hinzufügen
Sofern der Nutzer sich dazu entschieden hat, ein eigenes Spiel zu erstellen, kann er nun die Backlog-Items, welche gemeinsam eingeschätzt werden sollen, eintragen. Mindestens ein Eintrag ist erforderlich. Einträge können über den "Add"-Button hinzugefügt und über das Mülltonnen-Emoji entfernt werden. Durch einen Klick auf "Next" gelangt der Admin in die Lobby.

### Lobby
In der Lobby können alle Teilnehmer einsehen, wer dem Spiel beigetreten ist. Zudem wird eine Vorschau eingeblendet, welche alle vom Admin hinzugefügten Backlog-Items anzeigt. Der Admin kann das Spiel über einen Klick auf dem, für ihn sichtbaren, Button "Start Game" starten. Beitretende Nutzer werden live zur Liste an Teilnehmern hinzugefügt.

### Voting
Die Nutzer können für jedes Item einzeln eine Einschätzung des Umfangs abgeben. Dazu sind die Fibonacci Zahlen von 1 bis 21 in Form von Buttons verfügbar. Es wird live angezeigt, welcher Nutzer bereits abgestimmt haben. Der Admin kann die Abstimmung auch vorzeitig (d.h. bevor alle Nutzer abgestimmt haben) beenden.

### Results
Nach jeder Abstimmung werden die Abstimmungsergebnisse angezeigt. An dieser Stelle können etwaige Diskussion über Abstimmungen stattfinden. Im Anschluss kann der Admin entweder zum nächsten Item springen (sofern verfügbar) oder die Abstimmung für dieses Item wiederholen.
Sollte über alle hinzugefügten Items abgestimmt worden sein, kann der Admin alle Teilnehmer auf die Summary-Seite weiterleiten.

### Summary
In der Summary werden alle Backlog-Items inklusive dem durchschnittlichen Abstimmungsergebnis aufgelistet.
Das Ergebnis aller Items wird zusätzlich aufgeführt, um den Umfang aller Items schnell ersichtlich zu machen.
Die Nutzer können über einen Klick auf den Button "Back to main page" zurück zur Startseite der Komponente gelangen.

### Subkomponente: Spiel-Leiste
Im oberen Bereich der Website befindet sich eine Leiste, welche die ID des Spiels enthält. Diese kann per Klick kopiert werden, um anschließend mit den Teammitgliedern geteilt zu werden. Dazu gibt es ebenfalls einen Button, welcher beim Klick eine URL kopiert, über die der zuvor beschriebene Beitritt beschleunigt wird. Dies ist zudem über einen QR Code möglich, welcher angezeigt wird, wenn man auf den "QR" Button drückt.
Zuletzt hat die Leiste noch einen Einstellungs-Button, welcher nur für den Admin des Spiels angezeigt wird. Dieser öffnet eine Seitenleiste, in welcher alle Teilnehmer angezeigt werden. Diese können an dieser Stelle im Verlauf des Spiels vom Admin gebannt werden. Dadurch werden sie aus dem Raum entfernt und können diesem nicht erneut beitreten.

### Events: Toast
Bei Events wie dem Beitritt eines neuen Nutzers, der Verbannung eines Nutzers oder des Verbindungsverlustes wird im unteren Bereich der Komponente eine sog. Toast-Nachricht eingeblendet.
