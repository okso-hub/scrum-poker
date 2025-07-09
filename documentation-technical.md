### Kommunikation Client <---> Server
´´´mermaid
graph LR
    subgraph "Frontend"
        UI[UI Components<br/>ace-lobby.js, ace-navbar.js]
        WS_Client[WebSocket Client<br/>agile-ace.js]
    end
    subgraph "API Routes"
        RoomRoutes[Room Routes<br/>/create, /join, /participants]
        AdminRoutes[Admin Routes<br/>/ban, /start, /items]
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
´´´


### Ban user flow
´´´mermaid
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
´´´