import "./pages/ace-landing.js";
import "./pages/ace-items.js";
import "./pages/ace-lobby.js";
import "./pages/ace-results.js";
import "./pages/ace-voting.js";
import "./pages/ace-summary.js";
import "./components/ace-navbar.js";
import { createToastHost, showToastInShadow, toast } from "./utils/shadow-toast.js";

class AgileAce extends HTMLElement {
  // Default configuration
  static get DEFAULT_CONFIG() {
    return {
      width: "800px",
      height: "600px",
      toastDuration: 3000,
      connectionTimeout: 5000
    };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    
    // Initialize component state
    this._initializeState();
    
    // Set up component structure and styling
    this._setupComponent();
    
    // Start the application
    this._initialize();
  }

  _initializeState() {
    // Component state
    this._roomId = null;
    this._name = null;
    this._role = null;
    this._status = null;
    this._item = null;
    this._allPlayers = null;
    this._currentLobby = null;
    this._currentVoting = null;
    this._ws = null;
    
    // Configuration
    this._backendUrl = this.getAttribute("backend-url");
  }

  _setupComponent() {
    this._applyHostStyles();
    this._bindEvents();
    this._createStructure();
  }

  _applyHostStyles() {
    const { width, height } = AgileAce.DEFAULT_CONFIG;
    
    // Apply host element styles
    Object.assign(this.style, {
      width: this.getAttribute("width") || width,
      height: this.getAttribute("height") || height,
      display: "block",
      overflow: "auto",
      boxSizing: "border-box"
    });
  }

  _createStructure() {
    // Create main wrapper container
    this._wrapperContainer = this._createWrapperContainer();
    
    // Create navbar container
    this._navbarContainer = this._createNavbarContainer();
    this._navbar = this._createNavbar();
    this._navbarContainer.appendChild(this._navbar);
    
    // Create content container
    this._contentContainer = this._createContentContainer();
    
    // Assemble structure
    this._wrapperContainer.appendChild(this._navbarContainer);
    this._wrapperContainer.appendChild(this._contentContainer);
    this.shadowRoot.appendChild(this._wrapperContainer);
    
    // Initialize toast system
    this._initializeToastHost();
  }

  _createWrapperContainer() {
    const container = document.createElement("div");
    Object.assign(container.style, {
      width: "100%",
      height: "100%",
      overflow: "auto",
      boxSizing: "border-box",
      position: "relative"
    });
    return container;
  }

  _createNavbarContainer() {
    const container = document.createElement("div");
    container.style.display = "none"; // Hidden by default
    return container;
  }

  _createNavbar() {
    const navbar = document.createElement("ace-navbar");
    navbar.setAttribute("backend-url", this._backendUrl);
    return navbar;
  }

  _createContentContainer() {
    return document.createElement("div");
  }

  _initialize() {
    this._renderLanding();
  }

  _bindEvents() {
    this.addEventListener("ace-create", (e) => this._onCreate(e.detail));
    this.addEventListener("ace-join", (e) => this._onJoin(e.detail));
    this.addEventListener("ace-vote", (e) => this._sendVote(e.detail.value));
    this.addEventListener("ace-back-to-landing", () => this._goBackToLanding());
  }

  _initializeToastHost() {
    // Initialize toast for wrapper container instead of shadow root
    if (this._wrapperContainer) {
      createToastHost(this._wrapperContainer);
    }
  }

  _initializeNavbar() {
        // Create main wrapper container - nimmt 100% der Host-Größe ein
    this._wrapperContainer = document.createElement("div");
    this._wrapperContainer.style.width = "100%";
    this._wrapperContainer.style.height = "100%";
    this._wrapperContainer.style.overflow = "auto"; // Ermöglicht Scrollen bei Überlauf
    this._wrapperContainer.style.boxSizing = "border-box"; // Padding/Border inklusive
    this._wrapperContainer.style.position = "relative"; // Für absolute Positionierung der Toasts
    
    // Create navbar container
    this._navbarContainer = document.createElement("div");
    this._navbarContainer.style.display = "none"; // Hidden by default
    
    // Create navbar element
    this._navbar = document.createElement("ace-navbar");
    this._navbar.setAttribute("backend-url", this._backendUrl);
    
    this._navbarContainer.appendChild(this._navbar);
    this._wrapperContainer.appendChild(this._navbarContainer);
    
    // Create main content container
    this._contentContainer = document.createElement("div");
    
    this._wrapperContainer.appendChild(this._contentContainer);
    this.shadowRoot.appendChild(this._wrapperContainer);
    
    // Initialize toast host AFTER wrapper is created and attached
    this._initializeToastHost();
  }

  _showNavbar() {
    if (this._navbar && this._gameId) {
      // Set attributes BEFORE making visible
      this._navbar.setAttribute("game-id", this._gameId);
      this._navbar.setAttribute("is-admin", this._role === "admin");
      
      // Force the navbar to re-initialize with new attributes
      if (this._navbar._gameId !== this._gameId) {
        this._navbar._gameId = this._gameId;
        this._navbar._isAdmin = this._role === "admin";
        // Trigger re-render if the navbar has such a method
        if (typeof this._navbar._render === 'function') {
          this._navbar._render();
        }
      }
      
      // Exit minimal mode - show full navbar
      this._navbar.setMinimalMode(false);
      this._navbarContainer.style.display = "block";
      
      // Clear existing branding to prevent duplicates
      const existingBranding = this._navbar.querySelectorAll('[slot="branding"]');
      existingBranding.forEach(node => node.remove());
      
      // Copy branding to navbar only if not already present
      const brandingNodes = Array.from(this.querySelectorAll('[slot="branding"]'));
      brandingNodes.forEach(node => {
        this._navbar.appendChild(node.cloneNode(true));
      });
    }
  }

  _showMinimalNavbar() {
    if (this._navbar) {
      this._navbarContainer.style.display = "block";
      
      // Copy branding to navbar
      const brandingNodes = Array.from(this.querySelectorAll('[slot="branding"]'));
      brandingNodes.forEach(node => {
        this._navbar.appendChild(node.cloneNode(true));
      });
      
      // Wait for navbar to be fully rendered before setting minimal mode
      setTimeout(() => {
        this._navbar.setMinimalMode(true);
      }, 0);
    }
  }

  _hideNavbar() {
    if (this._navbarContainer) {
      this._navbarContainer.style.display = "none";
    }
  }

  _renderLanding() {
    this._showMinimalNavbar(); // Show minimal navbar instead of hiding
    this._contentContainer.innerHTML = "";
    this._contentContainer.append(document.createElement("ace-landing"));
  }

  _goBackToLanding() {
    // Close WebSocket connection (if still existing)
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }

    // Reset all held variables
    this._gameId = null;
    this._name = null;
    this._role = null;
    this._status = null;
    this._item = null;
    this._allPlayers = null;
    this._currentLobby = null;
    this._currentVoting = null;

    // navigate to landing page
    this._renderLanding();
  }

  // Renders page where the admin can add items
  _renderItems() {
    this._showNavbar();
    
    const brandingNodes = Array.from(
      this.querySelectorAll('[slot="branding"]')
    );

    console.log("Rendering items with branding nodes:", brandingNodes);
  
    this._contentContainer.innerHTML = "";
  
    const cmp = document.createElement("ace-items");
    cmp.setAttribute("game-id", this._gameId);
    cmp.setAttribute("is-admin", this._role === "admin");
    cmp.setAttribute("backend-url", this._backendUrl);
    cmp.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
    
    // Pass default items if they exist
    const defaultItems = this.getAttribute("default-items");
    if (defaultItems) {
      cmp.setAttribute("default-items", defaultItems);
    }
  
    brandingNodes.forEach(node => {
      cmp.appendChild(node.cloneNode(true));
    });
  
    cmp.addEventListener("ace-items-submitted", (e) => {
      console.log("Items saved:", e.detail.items);
      this._renderLobby();
    });
  
    this._contentContainer.append(cmp);
  }
  

  _renderLobby() {
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const lobby = document.createElement("ace-lobby");
    lobby.setAttribute("game-id", this._gameId);
    lobby.setAttribute("backend-url", this._backendUrl);
    lobby.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
    this._contentContainer.append(lobby);
    this._currentLobby = lobby;
  }

  // Renders each question page where users can vote
  _renderQuestion({ item, options }) {
    this._item = item; // Store current item
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const comp = document.createElement("ace-voting");

    comp.setAttribute("item", item);
    comp.setAttribute("options", JSON.stringify(options));
    comp.setAttribute("game-id", this._gameId);
    comp.setAttribute("player-name", this._name);
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("all-players", JSON.stringify(this._allPlayers || []));
    comp.setAttribute("backend-url", this._backendUrl);
    comp.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
    this._contentContainer.append(comp);
    this._currentVoting = comp;
    this._currentLobby = null;
  }

  // Tells the backend to reveal the votes for everyone; WebSocket event will be sent after
  async _revealVotes() {
    await fetch(this._backendUrl + `/room/${this._gameId}/reveal`, { method: "POST" });
  }

  _showToast(message, type = 'info', duration = 5000) {
    console.log("Showing toast:", message, type, duration);
    
    if (this._wrapperContainer) {
      showToastInShadow(this._wrapperContainer, message, duration, type);
      console.log("Toast shown in wrapper container");
    } else {
      console.log(`Toast (wrapper not available): ${message} (${type})`);
    }
  }

  // Renders the results page after each voting
  //TODO: why is this called show not render?
  _showResults(results, isLastItem = false) {
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const comp = document.createElement("ace-results");
    comp.setAttribute("results", JSON.stringify(results));
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("game-id", this._gameId);
    comp.setAttribute("is-last-item", isLastItem);
    comp.setAttribute("backend-url", this._backendUrl);
    comp.setAttribute("hide-navbar", "true");
    comp.setAttribute("player-name", this._name); // Add current player name
    comp.setAttribute("all-players", JSON.stringify(this._allPlayers || []));
    comp.setAttribute("question", this._item || "Unknown Item"); // Add current item as question
    
    // Ensure the component is properly appended and check for errors
    this._contentContainer.appendChild(comp);
    this._currentLobby = null;
    this._currentVoting = null;
    
    console.log("Results component created:", comp);
    console.log("Results data:", results);
  }

  // Renders the summary page (end of the game)
  _renderSummary(summary) {
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const comp = document.createElement("ace-summary");
    comp.setAttribute("summary", JSON.stringify(summary));
    comp.setAttribute("backend-url", this._backendUrl);
    comp.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
    this._contentContainer.append(comp);
  }

  // "Create Game"-Button was pressed
  async _onCreate({ name }) {
    console.log("Creating game with name:", name);

    const res = await fetch(this._backendUrl + "/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    if (!res.ok) {
      // If unsuccesful, the body will contain the error in JSON format
      const err = await res.json();
      return alert(err.error || "Error on game creation");
    }

    const { roomId } = await res.json();

    console.log('Game id: ' + roomId)

    this._name = name;
    this._gameId = Number(roomId);
    this._role = "admin";

    const params = new URLSearchParams(window.location.search);
    params.set("gameId", this._gameId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();
    this._renderItems();
    console.log(`Admin for game ${this._gameId}`);
  }

  // "Join Game"-Button was pressed
  async _onJoin({ name, gameId }) {
    console.log("Joining game with name:", name, "and gameId:", gameId);

    const res = await fetch(this._backendUrl + "/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roomId: Number(gameId) }),
    });

    // If unsuccesful, the body will contain the error in JSON format
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Error on join");
    }

    const payload = await res.json();
    console.log("↩️ /join returned:", payload);
    const { isAdmin, name: serverName, roomState } = payload;

    this._name = serverName;
    this._gameId = Number(gameId);
    this._role = isAdmin ? "admin" : "player";
    this._status = roomState.status;
    this._item = roomState.currentItem;


    console.log(`Joined game ${this._gameId} as ${this._role} with name "${this._name}"`);

    const params = new URLSearchParams(window.location.search);
    params.set("gameId", this._gameId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();

    console.log(`Rejoiningin status "${this._status}"`);

    // for newly joining users, we want to show the same page as other users are seeing, hence why we want to have them render that specific page
    switch (this._status) {

      case "setup":
        if (this._role === "admin") {
          this._renderItems();
        } else {
          this._renderLobby();
        }
        break;

      case "voting":
        this._renderQuestion({
          item: this._item,
          options: [1, 2, 3, 5, 8, 13, 21],
        });
        break;

      case "revealing":
        this._renderLobby();
        break;

      case "completed":
        {
          // fetch summary page details in order to display them
          const sumRes = await fetch(this._backendUrl + `/room/${this._gameId}/summary`, { method: "POST" });
          const { summary } = await sumRes.json();
          this._renderSummary(summary);
        }
        break;

      default:
        console.warn("Unknown game status:", this._status);
        this._renderLobby();
    }

    console.log(`Rejoined game ${gameId} in status "${this._status}"`);
  }

  _connectWS() {
    const url = this.getAttribute("backend-url") + "/ws";
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {

      // send user info when connected to WebSocket
      this._ws.send(
        JSON.stringify({
          roomId: this._gameId,
          role: this._role,
          payload: { name: this._name },
        })
      );
      this._showToast("Connection established", "success", 2000);
    };

    // Handle all specified WS messages (e.g. for showing toast messages or sending the user to the next page of the game)
    this._ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      console.log("[WS] Received message: ", msg);

      if (msg.event === "cards-revealed") {
        // Update allPlayers if provided in the message
        if (msg.allPlayers) {
          this._allPlayers = msg.allPlayers;
        }
        this._showResults(msg.results, msg.isLastItem);
      } else if (msg.event === "reveal-item") {
        this._allPlayers = msg.allPlayers;
        this._renderQuestion(msg);
      } else if (msg.event === "show-summary") {
        this._renderSummary(msg.summary);
      } else if (msg.event === "vote-status-update") {
        this._currentVoting._onVoteReceived(msg.votedPlayers);
        
      } else if (msg.event === "user-joined") {
        if(this._currentLobby !== undefined && this._currentLobby !== null) {
          this._currentLobby._onUserJoined(msg.user);
        }
        this._showToast(`${msg.user} joined the game`, "success", 10000);
      } else if (msg.event === "user-banned") {
        if(this._currentLobby !== undefined && this._currentLobby !== null) {
          this._currentLobby._onUserBanned(msg.user);
        }
        this._showToast(`${msg.user} was banned from the game`, "warning", 10000);
      } else if(msg.event === "banned-by-admin") {
        this._showToast(`You were banned by the Admin ⛔`, "error", 30000);
      }
      else {
        const { from, payload } = msg;
        console.log(`WS ← ${from}:`, payload);
      }
    };

    this._ws.onclose = () => {
      console.log("WebSocket closed");
      this._showToast("Connection closed", "warning", 5000);
    };
    this._ws.onerror = (e) => {
      console.error("WebSocket errored", e);
      this._showToast("A connection error occurred", "error", 5000);
    };
  }
}

customElements.define("agile-ace", AgileAce);
