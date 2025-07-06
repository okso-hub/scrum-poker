import "./pages/ace-landing.js";
import "./pages/ace-items.js";
import "./pages/ace-lobby.js";
import "./pages/ace-results.js";
import "./pages/ace-voting.js";
import "./pages/ace-summary.js";
import { createToastHost, showToastInShadow, toast } from "./utils/shadow-toast.js";

class AgileAce extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._bindEvents();
    this._initializeToastHost();
    this._renderLanding();
  }

  _bindEvents() {
    this.addEventListener("ace-create", (e) => this._onCreate(e.detail));
    this.addEventListener("ace-join", (e) => this._onJoin(e.detail));
    this.addEventListener("ace-vote", (e) => this._sendVote(e.detail.value));
    this.addEventListener("ace-back-to-landing", () => this._goBackToLanding());
  }

  _initializeToastHost() {
    // Toast-Host für Shadow DOM initialisieren
    if (this.shadowRoot) {
      createToastHost(this.shadowRoot);
    }
  }

  _renderLanding() {
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.append(document.createElement("ace-landing"));
  }

  _goBackToLanding() {
    // WebSocket-Verbindung schließen, falls vorhanden
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }

    // Alle Zustandsvariablen zurücksetzen
    this._roomId = null;
    this._name = null;
    this._role = null;
    this._status = null;
    this._item = null;
    this._allPlayers = null;
    this._currentLobby = null;
    this._currentVoting = null;
    // Zur Startseite navigieren
    this._renderLanding();
  }

  _renderItems() {
    this.shadowRoot.innerHTML = "";
    const cmp = document.createElement("ace-items");
    cmp.setAttribute("room-id", this._roomId);
    cmp.setAttribute("is-admin", this._role === "admin");
    cmp.addEventListener("ace-items-submitted", (e) => {
      console.log("Items saved:", e.detail.items);
      this._renderLobby();
    });
    this.shadowRoot.append(cmp);
  }

  _renderLobby() {
    this.shadowRoot.innerHTML = "";
    const lobby = document.createElement("ace-lobby");
    lobby.setAttribute("room-id", this._roomId);
    lobby.setAttribute("ws-url", this.getAttribute("ws-url"));
    this.shadowRoot.append(lobby);
    this._currentLobby = lobby;
  }

  _renderQuestion({ item, options }) {
    this.shadowRoot.innerHTML = "";
    const comp = document.createElement("ace-voting");
    console.log("rendering question, admin?", this._role === "admin");
    comp.setAttribute("item", item);
    comp.setAttribute("options", JSON.stringify(options));
    comp.setAttribute("room-id", this._roomId);
    comp.setAttribute("player-name", this._name);
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("all-players", JSON.stringify(this._allPlayers || []));
    this.shadowRoot.append(comp);
    this._currentVoting = comp;
    this._currentLobby = null;
  }

  async _revealVotes() {
    await fetch(`/room/${this._roomId}/reveal`, { method: "POST" });
  }

  _showToast(message, type = 'info', duration = 5000) {
    console.log("Showing toast:", message, type, duration);
    
    // Shadow DOM Toast verwenden
    if (this.shadowRoot) {
      showToastInShadow(this.shadowRoot, message, duration, type);
      console.log("Toast shown in shadow DOM");
    } else {
      console.log(`Toast (shadowRoot nicht verfügbar): ${message} (${type})`);
    }
  }

  _showResults(results, isLastItem = false) {
    this.shadowRoot.innerHTML = "";
    const comp = document.createElement("ace-results");
    comp.setAttribute("results", JSON.stringify(results));
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("room-id", this._roomId);
    comp.setAttribute("is-last-item", isLastItem);
    this.shadowRoot.append(comp);
    this._currentLobby = null;
    this._currentVoting = null;
  }

  _renderSummary(summary) {
    this.shadowRoot.innerHTML = "";
    const comp = document.createElement("ace-summary");
    comp.setAttribute("summary", JSON.stringify(summary));
    this.shadowRoot.append(comp);
  }

  async _onCreate({ name }) {
    console.log("Creating room with name:", name);
    const res = await fetch("/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Error on game creation");
    }
    const { roomId } = await res.json();

    this._name = name;
    this._roomId = roomId;
    this._role = "admin";

    const params = new URLSearchParams(window.location.search);
    params.set("roomId", this._roomId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();
    this._renderItems();
    console.log(`Admin for room ${roomId}`);
  }

  async _onJoin({ name, gameId }) {
    console.log("Joining room with name:", name, "and gameId:", gameId);
    const res = await fetch("/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, roomId: gameId }),
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || "Error on join");
    }

    const { isAdmin, name: serverName, roomState } = await res.json();
    this._name = serverName;
    this._roomId = gameId;
    this._role = isAdmin ? "admin" : "player";
    this._status = roomState.status;
    this._item = roomState.currentItem;

    const params = new URLSearchParams(window.location.search);
    params.set("roomId", this._roomId);
    window.history.replaceState({}, "", `${location.pathname}?${params}`);

    this._connectWS();

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
          const sumRes = await fetch(`/room/${this._roomId}/summary`, { method: "POST" });
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
    const url = this.getAttribute("ws-url") + "/ws";
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      this._ws.send(
        JSON.stringify({
          roomId: this._roomId,
          role: this._role,
          payload: { name: this._name },
        })
      );
      this._showToast("Verbindung hergestellt", "success", 2000);
    };

    this._ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      console.log("received message", msg);
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
        this._showToast(`${msg.user} ist dem Spiel beigetreten`, "success", 3000);
      } else if (msg.event === "user-banned") {
        if(this._currentLobby !== null) {
          this._currentLobby._onUserBanned(msg.user);
        }
        this._showToast(`${msg.user} wurde vom Spiel ausgeschlossen`, "warning", 4000);
      } else {
        const { from, payload } = msg;
        console.log(`WS ← ${from}:`, payload);
      }
    };

    this._ws.onclose = () => {
      console.log("WebSocket closed");
      this._showToast("Verbindung getrennt", "warning", 3000);
    };
    this._ws.onerror = (e) => {
      console.error("WebSocket errored", e);
      this._showToast("Verbindungsfehler", "error", 4000);
    };
  }
}

customElements.define("agile-ace", AgileAce);
