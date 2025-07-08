import "./pages/ace-landing.js";
import "./pages/ace-items.js";
import "./pages/ace-lobby.js";
import "./pages/ace-results.js";
import "./pages/ace-voting.js";
import "./pages/ace-summary.js";
import "./components/ace-navbar.js";
import { createToastHost, showToastInShadow, toast } from "./utils/shadow-toast.js";

class AgileAce extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._bindEvents();
    this._initializeToastHost();
    this._initializeNavbar();
    this._renderLanding();

    this._backendUrl = this.getAttribute("backend-url");
  }

  _bindEvents() {
    this.addEventListener("ace-create", (e) => this._onCreate(e.detail));
    this.addEventListener("ace-join", (e) => this._onJoin(e.detail));
    this.addEventListener("ace-vote", (e) => this._sendVote(e.detail.value));
    this.addEventListener("ace-back-to-landing", () => this._goBackToLanding());
  }

  _initializeToastHost() {
    // Initialize toast for shadow DOM
    if (this.shadowRoot) {
      createToastHost(this.shadowRoot);
    }
  }

  _initializeNavbar() {
    // Create navbar container
    this._navbarContainer = document.createElement("div");
    this._navbarContainer.style.display = "none"; // Hidden by default
    
    // Create navbar element
    this._navbar = document.createElement("ace-navbar");
    this._navbar.setAttribute("backend-url", this._backendUrl);
    
    this._navbarContainer.appendChild(this._navbar);
    this.shadowRoot.appendChild(this._navbarContainer);
    
    // Create main content container
    this._contentContainer = document.createElement("div");
    this.shadowRoot.appendChild(this._contentContainer);
  }

  _showNavbar() {
    if (this._navbar && this._roomId) {
      // Set attributes BEFORE making visible
      this._navbar.setAttribute("room-id", this._roomId);
      this._navbar.setAttribute("is-admin", this._role === "admin");
      
      // Force the navbar to re-initialize with new attributes
      if (this._navbar._roomId !== this._roomId) {
        this._navbar._roomId = this._roomId;
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
    this._roomId = null;
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
    cmp.setAttribute("room-id", this._roomId);
    cmp.setAttribute("is-admin", this._role === "admin");
    cmp.setAttribute("backend-url", this._backendUrl);
    cmp.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
  
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
    lobby.setAttribute("room-id", this._roomId);
    lobby.setAttribute("backend-url", this._backendUrl);
    lobby.setAttribute("hide-navbar", "true"); // Tell component not to render its own navbar
    this._contentContainer.append(lobby);
    this._currentLobby = lobby;
  }

  // Renders each question page where users can vote
  _renderQuestion({ item, options }) {
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const comp = document.createElement("ace-voting");

    comp.setAttribute("item", item);
    comp.setAttribute("options", JSON.stringify(options));
    comp.setAttribute("room-id", this._roomId);
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
    await fetch(this._backendUrl + `/room/${this._roomId}/reveal`, { method: "POST" });
  }

  _showToast(message, type = 'info', duration = 5000) {
    console.log("Showing toast:", message, type, duration);
    
    if (this.shadowRoot) {
      showToastInShadow(this.shadowRoot, message, duration, type);
      console.log("Toast shown in shadow DOM");
    } else {
      console.log(`Toast (shadowRoot not available): ${message} (${type})`);
    }
  }

  // Renders the results page after each voting
  _showResults(results, isLastItem = false) {
    this._showNavbar();
    this._contentContainer.innerHTML = "";
    const comp = document.createElement("ace-results");
    comp.setAttribute("results", JSON.stringify(results));
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("room-id", this._roomId);
    comp.setAttribute("is-last-item", isLastItem);
    comp.setAttribute("backend-url", this._backendUrl);
    comp.setAttribute("hide-navbar", "true");
    
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
    console.log("Creating room with name:", name);

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

    this._name = name;
    this._roomId = Number(roomId);
    this._role = "admin";

    const params = new URLSearchParams(window.location.search);
    params.set("roomId", this._roomId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();
    this._renderItems();
    console.log(`Admin for room ${roomId}`);
  }

  // "Join Game"-Button was pressed
  async _onJoin({ name, gameId }) {
    console.log("Joining room with name:", name, "and gameId:", gameId);

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

    const { isAdmin, name: serverName, roomState } = await res.json();
    this._name = serverName;
    this._roomId = Number(gameId);
    this._role = isAdmin ? "admin" : "player";
    this._status = roomState.status;
    this._item = roomState.currentItem;

    const params = new URLSearchParams(window.location.search);
    params.set("roomId", this._roomId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();

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
          const sumRes = await fetch(this._backendUrl + `/room/${this._roomId}/summary`, { method: "POST" });
          const { summary } = await sumRes.json();
          this._renderSummary(summary);
        }
        break;

      default:
        console.warn("Unknown room status:", this._status);
        this._renderLobby();
    }

    console.log(`Rejoined room ${gameId} in status "${this._status}"`);
  }

  _connectWS() {
    const url = this.getAttribute("backend-url") + "/ws";
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {

      // send user info when connected to WebSocket
      this._ws.send(
        JSON.stringify({
          roomId: this._roomId,
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
        this._showResults(msg.results, msg.isLastItem);
      } else if (msg.event === "reveal-item") {
        this._allPlayers = msg.allPlayers;
        this._renderQuestion(msg);
      } else if (msg.event === "show-summary") {
        this._renderSummary(msg.summary);
      } else if (msg.event === "vote-status-update") {
        this._currentVoting._onVoteReceived(msg.votedPlayers);
        
      } else if (msg.event === "user-joined") {
        if(this._currentLobby !== null) {
          this._currentLobby._onUserJoined(msg.user);
        }
        this._showToast(`${msg.user} joined the game`, "success", 3000);
      } else if (msg.event === "user-banned") {
        if(this._currentLobby !== null) {
          this._currentLobby._onUserBanned(msg.user);
        }
        this._showToast(`${msg.user} was banned from the game`, "warning", 4000);
      } else {
        const { from, payload } = msg;
        console.log(`WS ← ${from}:`, payload);
      }
    };

    this._ws.onclose = () => {
      console.log("WebSocket closed");
      this._showToast("Connection closed", "warning", 3000);
    };
    this._ws.onerror = (e) => {
      console.error("WebSocket errored", e);
      this._showToast("A connection error occurred", "error", 4000);
    };
  }
}

customElements.define("agile-ace", AgileAce);
