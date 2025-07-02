// public/js/components/ace-lobby.js

const lobbyStyles = new CSSStyleSheet();
lobbyStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
.participants {
  text-align: center;
}
.participants h3 {
  margin-bottom: 0.5rem;
}
.participants ul {
  max-height: 200px;
  overflow-y: auto;
  padding: 0;
  list-style: none;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
.participants li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}
.participants li:last-child {
  border-bottom: none;
}
/* Ban hammer styled as a button */
.ban {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 0.5rem;
  padding: 0.25rem;
  font-size: 1.1rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  background: #f9f9f9;
  transition: background 0.1s ease;
}
.ban:hover {
  background: #efefef;
}
button#startBtn {
  display: block;
  margin: 1rem auto 0;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
}
`);

class AceLobby extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [lobbyStyles];
    this._participants = [];   // will be normalized to { name, ip? }
    this._isAdmin = false;
  }

  connectedCallback() {
    this._roomId = this.getAttribute('room-id');
    this._wsUrl  = this.getAttribute('ws-url');
    this._checkAdmin().then(() => {
      this._render();
      this._fetchParticipants();
      this._setupWebSocket();
    });
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <ace-navbar 
        room-id="${this._roomId}" 
        is-admin="${this._isAdmin}"
      ></ace-navbar>
      <div class="participants">
        <h3>Participants</h3>
        <ul id="list"></ul>
      </div>
      <button id="startBtn">Start Game</button>
    `;
    this._listEl   = this.shadowRoot.getElementById('list');
    this._startBtn = this.shadowRoot.getElementById('startBtn');
    this._startBtn.addEventListener('click', () => this._onStart());
  }

  async _fetchParticipants() {
    try {
      const res = await fetch(`/room/${this._roomId}/participants`);
      if (!res.ok) throw await res.json();
      let { participants } = await res.json();

      // Normalize array items to objects with a .name property
      this._participants = participants.map(p =>
        typeof p === 'string'
          ? { name: p }
          : ('name' in p ? p : { name: String(p) })
      );

      console.log('Loaded participants:', this._participants);
      this._updateList();
    } catch (e) {
      console.error('Failed to load participants:', e);
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
      console.error('Admin check failed:', e);
    }
  }

  _updateList() {
    this._listEl.innerHTML = this._participants
      .map(p => `
        <li>
          <span>${p.name}</span>
          ${this._isAdmin
            ? `<span class="ban" data-name="${p.name}" title="Ban">🔨</span>`
            : ''}
        </li>
      `).join('');

    if (this._isAdmin) {
      this.shadowRoot.querySelectorAll('.ban').forEach(btn => {
        btn.addEventListener('click', e => {
          const name = e.currentTarget.getAttribute('data-name');
          console.log('Ban button clicked for:', name);
          this._onBan(name);
        });
      });
    }
  }

  async _onBan(name) {
    if (!name) {
      console.error('No name passed to _onBan');
      return;
    }
    if (!confirm(`Really ban user "${name}"?`)) return;
    try {
      const res = await fetch(`/room/${this._roomId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Ban failed');
      }
      await this._fetchParticipants();
      console.log(`Banned ${name}`);
    } catch (e) {
      alert(e.message);
      console.error('Ban error:', e);
    }
  }

  _setupWebSocket() {
    const ws = new WebSocket(`${this._wsUrl}/ws`);
    ws.onopen = () => ws.send(this._roomId);
    ws.onmessage = ev => {
      console.log('received event');
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }

      if (msg.event === 'start') {
        this.dispatchEvent(new CustomEvent('ace-started', {
          detail: { item: msg.item, options: msg.options },
          bubbles: true,
          composed: true
        }));
      } else {
        this._fetchParticipants();
      }
    };
    ws.onerror = e => console.error('Lobby WS Error:', e);
  }

  async _onStart() {
    try {
      const res = await fetch(`/room/${this._roomId}/start`, { method: 'POST' });
      if (!res.ok) throw await res.json();
      console.log(`Start request successful for room ${this._roomId}`);
    } catch (e) {
      alert(e.error || e.message || 'Error starting game');
    }
  }
}

customElements.define('ace-lobby', AceLobby);
