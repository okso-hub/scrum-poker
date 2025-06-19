// public/js/components/ace-lobby.js
const lobbyStyles = new CSSStyleSheet();
lobbyStyles.replaceSync(`
:host { display:block; font-family:sans-serif; padding:1rem; }
.header { display:flex; justify-content:space-between; margin-bottom:1rem; }
.header div { font-size:0.9rem; }
.participants { text-align:center; }
.participants h3 { margin-bottom:0.5rem; }
.participants ul {
  max-height:200px; overflow-y:auto; padding:0; list-style:none;
  border:1px solid #ddd; border-radius:0.25rem;
}
.participants li {
  display:flex; justify-content:space-between;
  padding:0.5rem; border-bottom:1px solid #eee;
}
.participants li:last-child { border-bottom:none; }
.ban { cursor:pointer; margin-left:0.5rem; }
button#startBtn {
  display:block; margin:1rem auto 0; padding:0.75rem 1.5rem;
  font-size:1rem; cursor:pointer;
}
`);

class AceLobby extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    this.shadowRoot.adoptedStyleSheets = [lobbyStyles];
    this._participants = [];
    this._isAdmin = false;
  }

  connectedCallback() {
    this._roomId = this.getAttribute('room-id');
    this._wsUrl  = this.getAttribute('ws-url');
    this._render();
    this._fetchParticipants();
    this._checkAdmin();
    this._setupWebSocket();
  }

  _render() {
    const joinUrl = `${location.origin}${location.pathname}?roomId=${this._roomId}`;
    this.shadowRoot.innerHTML = `
      <div class="header">
        <div>Room-ID: ${this._roomId}</div>
        <div>Join-URL: <small>${joinUrl}</small></div>
      </div>
      <div class="participants">
        <h3>Participants</h3>
        <ul id="list"></ul>
      </div>
      <button id="startBtn">Start Game</button>
    `;
    this._listEl   = this.shadowRoot.getElementById('list');
    this._startBtn = this.shadowRoot.getElementById('startBtn');
    this._startBtn.onclick = () => this._onStart();
  }

  async _fetchParticipants() {
    try {
      const res = await fetch(`/room/${this._roomId}/participants`);
      if (!res.ok) throw await res.json();
      const { participants } = await res.json();
      this._participants = participants;
      this._updateList();
    } catch (e) {
      console.error('Konnte Participants nicht laden:', e);
    }
  }

  async _checkAdmin() {
    try {
      const res = await fetch(`/is-admin?roomId=${this._roomId}`);
      if (!res.ok) throw await res.json();
      const { isAdmin } = await res.json();
      this._isAdmin = isAdmin;
      this._updateList();
    } catch (e) {
      console.error('Admin-Check fehlgeschlagen:', e);
    }
  }

  _updateList() {
    this._listEl.innerHTML = this._participants.map(name => `
      <li>
        <span>${name}</span>
        ${this._isAdmin ? `<span class="ban" data-name="${name}" title="Ban">🔨</span>` : ''}
      </li>
    `).join('');

    if (this._isAdmin) {
      this.shadowRoot.querySelectorAll('.ban').forEach(btn => {
        btn.onclick = () => {
          console.log('Banhammer für', btn.dataset.name);
        };
      });
    }
  }

  _setupWebSocket() {
    const ws = new WebSocket(`${this._wsUrl}/ws`);
    ws.onopen = () => ws.send(this._roomId);
    ws.onmessage = ev => {
        let msg;
        try { msg = JSON.parse(ev.data); }
        catch { return; }

        // Server schickt { event:'start', item:..., options:[...] }
        if (msg.event === 'start') {
        // wir feuern ein CustomEvent nach außen…
        this.dispatchEvent(new CustomEvent('ace-started', {
            detail: { item: msg.item, options: msg.options },
            bubbles: true,
            composed: true
        }));
        } else {
        // alles andere sind Join-Events → aktuellen Teilnehmer-Status holen
        this._fetchParticipants();
        }
   };
    ws.onerror   = e => console.error('Lobby-WS Error:', e);
  }

  async _onStart() {
    try {
      const res = await fetch(`/room/${this._roomId}/start`, {
        method: 'POST'
      });
      if (!res.ok) throw await res.json();
      console.log(`Start-Request erfolgreich für Raum ${this._roomId}`);
      // Event vom Server per WS wird dann kommen
    } catch (e) {
      alert(e.error || e.message || 'Fehler beim Starten');
    }
  }
}

customElements.define('ace-lobby', AceLobby);
