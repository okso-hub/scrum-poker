// public/js/components/ace-lobby.js
import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceLobby extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._participants = [];
    this._items = [];
    this._isAdmin = false;
  }

  async connectedCallback() {
    const lobbyStyles = await loadStylesheet('/css/lobby.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(lobbyStyles);
    
    this._roomId = this.getAttribute('room-id');
    this._wsUrl  = this.getAttribute('ws-url');
    
    // ERST Admin-Status prüfen, DANN rendern
    await this._checkAdmin();
    this._render();  // ← Jetzt mit korrektem Admin-Status
    
    // Element-Referenzen nach dem Rendern
    this._listEl = this.shadowRoot.getElementById('list');
    this._startBtn = this.shadowRoot.getElementById('startBtn');
    this._itemsTable = this.shadowRoot.getElementById('itemsTable');
    this._itemsBody = this._itemsTable.querySelector('tbody');
    
    this._startBtn.addEventListener('click', () => this._onStart());
    
    // Daten laden
    await Promise.all([this._fetchParticipants(), this._fetchItems()]);
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
      <button id="startBtn" class="horizontal">Start Game</button>
      <div class="items">
        <h3>Today's Items</h3>
        <table id="itemsTable" class="left">
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
            ? `<span class="icon-button" data-name="${p.name}" title="Ban">🔨</span>`
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
