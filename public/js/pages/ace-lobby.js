// public/js/components/ace-lobby.js

const lobbyStyles = new CSSStyleSheet();
lobbyStyles.replaceSync(`
:host {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
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
.items {
  margin-top: auto;
  overflow-y: auto;
  max-height: 40vh;
}
.items h3 {
  text-align: center;
  margin-bottom: 0.5rem;
}
.items table {
  width: 100%;
  border-collapse: collapse;
}
.items th,
.items td {
  padding: 0.5rem;
  border: 1px solid #ddd;
  text-align: left;
}
.items th {
  background: #f5f5f5;
}
`);

class AceLobby extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [lobbyStyles];
    this._participants = [];
    this._items = [];
    this._isAdmin = false;
  }

  connectedCallback() {
    this._roomId = this.getAttribute('room-id');
    this._wsUrl  = this.getAttribute('ws-url');
    // Render immediately so list element exists
    this._render();

    // After rendering, element references are available
    this._listEl      = this.shadowRoot.getElementById('list');
    this._startBtn    = this.shadowRoot.getElementById('startBtn');
    this._itemsTable  = this.shadowRoot.getElementById('itemsTable');
    this._itemsBody   = this._itemsTable.querySelector('tbody');

    this._startBtn.addEventListener('click', () => this._onStart());

    // Check admin status and then fetch data
    this._checkAdmin()
      .then(() => Promise.all([this._fetchParticipants(), this._fetchItems()]))
      .catch(e => console.error(e));
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
      <div class="items">
        <h3>Today's Items</h3>
        <table id="itemsTable">
          <thead>
            <tr><th>ID</th><th>Item</th></tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;
  }

  async _fetchParticipants() {
    try {
      const res = await fetch(`/room/${this._roomId}/participants`);
      if (!res.ok) throw await res.json();
      let { participants } = await res.json();
      this._participants = participants.map(p =>
        typeof p === 'string' ? { name: p } : ('name' in p ? p : { name: String(p) })
      );
      this._updateList();
    } catch (e) {
      console.error('Failed to load participants:', e);
    }
  }

  async _fetchItems() {
    try {
      const res = await fetch(`/room/${this._roomId}/items`);
      if (!res.ok) throw await res.json();
      const { items } = await res.json();
      this._items = items;
      this._updateItems();
    } catch (e) {
      console.error('Failed to load items:', e);
    }
  }

  async _checkAdmin() {
    try {
      const res = await fetch(`/is-admin?roomId=${this._roomId}`);
      if (!res.ok) throw await res.json();
      const { isAdmin } = await res.json();
      this._isAdmin = isAdmin;
      // update list button rendering if participants already loaded
      this._updateList();
    } catch (e) {
      console.error('Admin check failed:', e);
    }
  }

  _updateList() {
    // guard: ensure list element exists
    if (!this._listEl) return;

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
          this._onBan(name);
        });
      });
    }
  }

  _updateItems() {
    this._itemsBody.innerHTML = this._items
      .map((item, idx) => `<tr><td>${idx + 1}</td><td>${item}</td></tr>`) 
      .join('');
  }

  async _onBan(name) {
    if (!name) return;
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
    } catch (e) {
      alert(e.message);
      console.error('Ban error:', e);
    }
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
