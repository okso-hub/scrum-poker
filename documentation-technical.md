## Architektur-Überblick

Die Anwendung ist eine **Full-Stack TypeScript/JavaScript** Anwendung mit einem **Express.js Backend** und einem **Vanilla JavaScript Frontend**. Sie verwendet **WebSockets** für Echtzeitkommunikation und **In-Memory Storage** für Daten.

### Technologie-Stack

**Backend:**
- **Node.js** mit **TypeScript**
- **Express.js** - REST-API-Framework
- **WebSocket (ws)** - Echtzeitkommunikation mit Benutzern
- **Vitest** - Testframework

**Frontend:**
- **Vanilla JavaScript** mit **Web Components**
- **Shadow DOM** für Kapselung
- **WebSocket-Client** für den Empfang von Echtzeit-Updates
- **CSS3** für Styling
- **Playwright** für E2E-Tests

**Entwicklung & Build:**
- **TypeScript-Compiler** für Backend
- **Vite** für Frontend-Build
- **Playwright** für E2E-Tests
- **Docker** für Containerisierung

## Projekt-Struktur

```
scrum-poker/
├── server/
│   ├── src/                    # TypeScript Backend Source
│   │   ├── index.ts           # Server Entry Point
│   │   ├── middleware/        # Express Middleware
│   │   │   ├── adminAuth.ts   # Admin Authorization
│   │   │   └── errorHandler.ts # Error Handling
│   │   ├── routes/            # API Route Handlers
│   │   │   ├── admin.ts       # Admin Operations (/ban, /start, /items)
│   │   │   └── rooms.ts       # Room Operations (/create, /join)
│   │   ├── services/          # Business Logic Layer
│   │   │   ├── RoomService.ts # Room Management
│   │   │   └── GameService.ts # Game Flow Logic
│   │   ├── types/             # TypeScript Definitions
│   │   │   └── index.ts       # Shared Types & Interfaces
│   │   └── utils/             # Utility Functions
│   │       ├── validation.ts  # Input Validation
│   │       └── ws.ts          # WebSocket Utilities
│   ├── public/                # Frontend Static Files
│   │   ├── index.html         # Main Entry Page
│   │   ├── js/                # JavaScript Components
│   │   │   ├── agile-ace.js   # Main App Component
│   │   │   ├── components/    # Reusable Components
│   │   │   └── pages/         # Page Components
│   │   ├── css/               # Stylesheets
│   │   └── html/              # HTML Templates
│   ├── tests/                 # Backend Tests
│   ├── dist/                  # Compiled TypeScript Output
│   └── package.json           # Dependencies & Scripts
```

## Architektur-Muster

```mermaid
graph TB
    subgraph "Presentation Layer"
        Routes[Route Handlers<br/>admin.ts, rooms.ts]
        Middleware[Middleware<br/>Auth, Error Handling]
    end

    subgraph "Business Logic Layer"
        RoomService[Room Service<br/>User Management]
        GameService[Game Service<br/>Voting Logic]
    end

    subgraph "Data Layer"
        Memory[(In-Memory Storage<br/>Map<roomId, Room>)]
    end

    subgraph "Communication Layer"
        WebSocket[WebSocket Server<br/>Real-time Events]
        HTTP[HTTP Server<br/>REST API]
    end

    Routes --> RoomService
    Routes --> GameService
    Routes --> WebSocket
    Middleware --> Routes
    RoomService --> Memory
    GameService --> Memory
    GameService --> RoomService
```

## Frontend: Komponentenbasierte Architektur

```mermaid
graph TB
    subgraph "Main App"
        AgileAce[agile-ace.js<br/>Main App Component]
    end

    subgraph "Page Components"
        Landing[ace-landing.js]
        Lobby[ace-lobby.js]
        Voting[ace-voting.js]
        Results[ace-results.js]
        Summary[ace-summary.js]
    end

    subgraph "Shared Components"
        Navbar[ace-navbar.js]
        Modal[ace-modal.js]
    end

    subgraph "Utilities"
        Templates[templates.js]
        Styles[styles.js]
        Toast[shadow-toast.js]
    end

    AgileAce --> Landing
    AgileAce --> Lobby
    AgileAce --> Voting
    AgileAce --> Results
    AgileAce --> Summary

    Landing --> Navbar
    Lobby --> Navbar
    Voting --> Navbar

    AgileAce --> Templates
    AgileAce --> Styles
    AgileAce --> Toast
```

In den einzelnen Pages werden Events dispatched (`this.dispatchEvent`; Beispiel-Event: `ace-back-to-landing`), welche im Root der Komponente (`agile-ace.js`) gefangen werden. Im Falle von `ace-back-to-landing` wird durch einen Klick auf "Back to main page" der Komponente mitgeteilt, dass diese zurück auf die Landing-Page gehen soll. Die Root der Komponente rendert die Landing-Page daraufhin. Auf diese Weise kommuniziert die Komponente intern zwischen den einzelnen Seiten.

## Kommunikation Client ←→ Server

```mermaid
graph LR
    subgraph "Frontend"
        UI[UI Components<br/>ace-lobby.js, ace-navbar.js]
        WS_Client[WebSocket Client<br/>agile-ace.js]
    end
    subgraph "API Routes"
        RoomRoutes[Room Routes<br/>/create, /join, /participants]
        AdminRoutes[Admin Routes<br/>/ban, /start, /items, /summary, /next/, /repeat, /reveal]
    end
    subgraph "Services"
        RoomService[Room Service<br/>createRoom, joinRoom, banUser]
        GameService[Game Service<br/>startVoting, revealVotes, nextItem]
    end
    subgraph "WebSocket"
        WSUtils[WebSocket Utils<br/>broadcast, disconnectUser]
        WSServer[WebSocket Server<br/>Connection Management]
    end
    subgraph "Data Storage"
        RoomData[(Room Data<br/>In-Memory Map)]
    end

    %% API Communication
    UI -->|HTTP Requests| RoomRoutes
    UI -->|HTTP Requests| AdminRoutes
    %% WebSocket Communication   
    WSServer -->|WebSocket| WS_Client
    %% Route to Service Communication
    RoomRoutes <--> RoomService
    AdminRoutes <--> RoomService
    AdminRoutes <--> GameService
    %% Service to Data
    RoomService <--> RoomData
    GameService <--> RoomData
    RoomRoutes["Room Routes<br>/create, /join"] --> WSUtils
    AdminRoutes --> WSUtils
    GameService
    WSUtils
    WSUtils --> WSServer
    %% Service Dependencies
    GameService -.->|uses| RoomService

    style RoomService fill:#f3e5f5
    style GameService fill:#f3e5f5
    style WSUtils fill:#fff3e0
    style RoomData fill:#e8f5e8

    style WSServer color:#8C52FF
    style WS_Client color:#8C52FF
    style Frontend fill:#D9D9D9,stroke:#545454
    style AdminRoutes color:#CB6CE6
    style RoomRoutes color:#CB6CE6
    style UI color:#CB6CE6
```

## Benutzer-Sperrablauf

Im Folgenden ist dargestellt, was passiert, wenn ein Benutzer gesperrt werden soll.

```mermaid
sequenceDiagram
    participant Admin as Admin
    participant API as Ban API
    participant Auth as Auth Check
    participant Room as Room Service
    participant WS as WebSocket

    Admin->>API: POST /room/:roomId/ban {name}
    API->>Auth: requireAdminAccess()
    Auth->>Room: isAdmin(roomId, ip)

    alt Not Admin
        Auth-->>API: 403 Forbidden
        API-->>Admin: Error
    else Admin OK
        API->>Room: banUser(roomId, userName)

        alt Invalid User/Admin/Not Found
            Room-->>API: 400/404 Error
            API-->>Admin: Error Message
        else Ban Success
            Room->>Room: Add IP to bannedIps
            Room->>Room: Remove from users
            Room-->>API: ✅ User banned

            API->>WS: disconnectUser(roomId, userName)
            WS->>WS: Send "banned-by-admin" to user
            WS->>WS: Close user connection

            API->>WS: broadcast "user-banned" event
            WS->>WS: Notify all other users

            API-->>Admin: Success
        end
    end

    Note over Room: User IP blocked<br/>from rejoining
```

## Datenmodell

### Raumstruktur
```typescript
interface Room {
  admin: User;              // Room Administrator
  users: User[];            // Regular Participants
  items: string[];          // Items to estimate
  itemHistory: string[];    // Completed items
  votes: Record<string, string>; // Current votes
  status: RoomStatus;       // Current game state
  bannedIps: string[];      // Banned IP addresses
}

interface User {
  name: string;
  ip: string;
}

enum RoomStatus {
  SETUP = "setup",           // Room created, waiting for items
  ITEMS_SUBMITTED = "items_submitted", // Items added, ready to start
  VOTING = "voting",         // Active voting phase
  REVEALING = "revealing",   // Votes revealed
  COMPLETED = "completed"    // All items estimated
}
```

## API-Endpunkte

### Raum-Operationen (`/api/rooms.ts`)
```text
POST /create              # Create new room
POST /join                # Join existing room
GET  /is-admin            # Check admin status
GET  /room/:id/items      # Get room items
GET  /room/:id/participants # Get participants
GET  /room/:id/status     # Get room status
POST /room/:id/vote       # Submit vote
```

### Administrator-Operationen (`/api/admin.ts`)
```text
POST /room/:id/items      # Set estimation items
POST /room/:id/start      # Start voting
POST /room/:id/reveal     # Reveal votes
POST /room/:id/repeat     # Repeat current item
POST /room/:id/next       # Move to next item
POST /room/:id/summary    # Show final summary
POST /room/:id/ban        # Ban user from room
```

## WebSocket-Ereignisse

### Client → Server
Direkt nach der erfolgreichen ws connection wird eine Nachricht vom Client an den Server geschickt, welche raumId und Name des Users enthält, damit die connection zugeordnet werden kann. Alle anderen events werden entsprechend unserer Architektur ausschließlich vom Server zum Client geschickt.
```javascript
{
  roomId: number,
  role: "admin" | "player",
  payload: { name: string }
}
```

### Server → Client
```javascript
// Game State Changes
{ event: "cards-revealed", results: Vote[], allPlayers: User[] }
{ event: "reveal-item", allPlayers: User[], item: string }
{ event: "show-summary", summary: Summary }
{ event: "vote-status-update", votedPlayers: string[] }

// User Management
{ event: "user-joined", user: string, rejoin: boolean }
{ event: "user-banned", user: string }
{ event: "banned-by-admin" }
```

## Sicherheit & Validierung

### Eingabevalidierung
- **Benutzername/Items**: RegEx-Muster `^[^<>&]{0,100}$` (Kein HTML/XSS) und Überprüfung auf definierte gesperrte Begriffe mittels RegEx
- **Raum-ID**: Numerische Validierung
- **IP-basiertes Admin-/Sperrsystem**

### Autorisierung
- **Administrator-Operationen**: IP-basierte Authentifizierung
- **Raumzugang**: Überprüfung gesperrter IPs
- **WebSocket**: Raumbezogene Nachrichtenfilterung

## CI-Pipeline

Unsere CI-Pipeline besteht aus mehreren Automatisierungsschritten, die bei jedem Push oder Pull Request auf dem **main**‑Branch ausgelöst werden:

1. **Server-Tests ausführen**
   - Repository auschecken
   - Node.js (Version 18) installieren
   - Abhängigkeiten im **server/**-Verzeichnis mit `npm ci` installieren
   - Unit- und Integrationstests mit `npm test` ausführen

2. **End-to-End‑Tests (Playwright)**
   - Abhängigkeiten erneut installieren (via Cache) und Playwright‑Browser installieren
   - Playwright‑Tests sequenziell (`--workers=1`) ausführen
   - Bei Fehlschlägen werden Test‑Artefakte (Berichte und Ergebnisse) hochgeladen

3. **Docker‑Image bauen und veröffentlichen**
   - Image mit dem aktuellen Commit-Hash und dem "latest"‑Tag erstellen
   - Als Paket im GitHub Container Registry (GHCR) ablegen

Auf dem Produktionsserver läuft zusätzlich **Watchtower**, das zyklisch das GHCR‑Repository überprüft und automatisch das Docker‑Image aktualisiert, sobald eine neue Version verfügbar ist.

![Succesfull Pipeline Run](image.png)
