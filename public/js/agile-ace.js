import "./pages/ace-landing.js";
import "./pages/ace-items.js";
import "./pages/ace-lobby.js";
import "./pages/ace-question.js";
import "./pages/ace-results.js";
import "./pages/ace-voting.js";
import "./pages/ace-summary.js";

class AgileAce extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._bindEvents();
    this._renderLanding();
  }

  _bindEvents() {
    this.addEventListener("ace-create", (e) => this._onCreate(e.detail));
    this.addEventListener("ace-join", (e) => this._onJoin(e.detail));
    this.addEventListener("ace-started", (e) => this._renderQuestion(e.detail));
    this.addEventListener("ace-vote", (e) => this._sendVote(e.detail.value));
  }

  _renderLanding() {
    this.shadowRoot.innerHTML = "";
    this.shadowRoot.append(document.createElement("ace-landing"));
  }

  _renderItems() {
    this.shadowRoot.innerHTML = "";
    const cmp = document.createElement("ace-items");
    cmp.setAttribute("room-id", this._roomId);
    cmp.setAttribute("is-admin", this._role === "admin");
    cmp.addEventListener("ace-items-submitted", (e) => {
      console.log("Items gespeichert:", e.detail.items);
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
  }

  _renderQuestion({ item, options }) {
    this.shadowRoot.innerHTML = "";
    const comp = document.createElement("ace-voting");
    comp.setAttribute("item", item);
    comp.setAttribute("options", JSON.stringify(options));
    comp.setAttribute("room-id", this._roomId);
    comp.setAttribute("player-name", this._name);
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("all-players", JSON.stringify(this._allPlayers || []));
    this.shadowRoot.append(comp);
  }

  async _revealVotes() {
    await fetch(`/room/${this._roomId}/reveal`, { method: "POST" });
  }

  _showResults(results, isLastItem = false) {
    this.shadowRoot.innerHTML = "";
    const comp = document.createElement("ace-results");
    comp.setAttribute("results", JSON.stringify(results));
    comp.setAttribute("is-admin", this._role === "admin");
    comp.setAttribute("room-id", this._roomId);
    comp.setAttribute("is-last-item", isLastItem);
    this.shadowRoot.append(comp);
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
      return alert(err.error || "Fehler beim Erstellen");
    }
    const { roomId } = await res.json();

    this._name = name;
    this._roomId = roomId;
    this._role = "admin";

    this._connectWS();
    this._renderItems();
    console.log(`Admin für Raum ${roomId}`);
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
      return alert(err.error || "Fehler beim Beitreten");
    }

    const { isAdmin, name: serverName, roomState } = await res.json();
    this._name = serverName;
    this._roomId = gameId;
    this._role = isAdmin ? "admin" : "player";
    this._status = roomState.status;
    this._item = roomState.currentItem;

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
    };

    this._ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.event === "cards-revealed") {
        this._showResults(msg.results, msg.isLastItem);
      } else if (msg.event === "start") {
        this._allPlayers = msg.allPlayers;
        this._renderQuestion(msg);
      } else if (msg.event === "show-summary") {
        this._renderSummary(msg.summary);
      } else if (msg.event === "vote-status-update") {
        console.log("Vote status update received, but handled by ace-voting component");
      } else {
        const { from, payload } = msg;
        console.log(`WS ← ${from}:`, payload);
      }
    };

    this._ws.onclose = () => console.log("WebSocket geschlossen");
    this._ws.onerror = (e) => console.error("WS-Fehler", e);
  }
}

customElements.define("agile-ace", AgileAce);
