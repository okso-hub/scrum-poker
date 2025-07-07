// public/js/components/ace-lobby.js
import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceLobby extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._participants = [];
    this._items = [];
    this._isAdmin = false;
  }

  async connectedCallback() {
    // Styles und Template parallel laden
    const [lobbyStyles, lobbyTemplate] = await Promise.all([
      loadStylesheet('/css/lobby.css'),
      loadTemplate('/html/ace-lobby.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(lobbyStyles);
    this._template = lobbyTemplate;
    
    this._roomId = this.getAttribute('room-id');
    this._backendUrl = this.getAttribute("backend-url");
    this._hideNavbar = this.getAttribute('hide-navbar') === 'true';
    
    // ERST Admin-Status prüfen, DANN rendern
    await this._checkAdmin();
    this._render();  // ← Jetzt mit korrektem Admin-Status
    
    // Element-Referenzen nach dem Rendern
    this._listEl = this.shadowRoot.getElementById('participants-list');
    this._itemsTable = this.shadowRoot.getElementById('items-table');
    this._itemsBody = this._itemsTable.querySelector('tbody');
    this._startGameControls = this.shadowRoot.getElementById('game-controls');

    if (this._isAdmin) {
      // Show "Start Game" button
      const startGameBtn = document.createElement('button');
      startGameBtn.textContent = 'Start Game';
      startGameBtn.type = 'button';
      startGameBtn.id = 'start-game-button';
      startGameBtn.className = 'horizontal';
      startGameBtn.setAttribute('aria-label', 'Start the estimation game');
      this._startGameControls.appendChild(startGameBtn);

      startGameBtn.addEventListener('click', () => this._onStart());
    } else {
      // Show "Waiting for admin to start game..." text
      // ToDo: CSS for this text
      const startInfoText = document.createElement('p');
      startInfoText.textContent = 'Waiting for admin to start game...';
      startInfoText.type = 'p';
      startInfoText.id = 'waiting-game-info-text';
      startInfoText.className = 'horizontal';
      startInfoText.setAttribute('aria-label', 'Waiting for admin to start game...');
      this._startGameControls.appendChild(startInfoText);
    }
    
    // Daten laden
    await Promise.all([this._fetchParticipants(), this._fetchItems()]);
  }

  _render() {
    const html = interpolateTemplate(this._template, {
      roomId: this._roomId,
      isAdmin: this._isAdmin,
      backendUrl: this._backendUrl,
      hideNavbar: this._hideNavbar
    });
    
    this.shadowRoot.innerHTML = html;

    // Remove navbar if hide-navbar is true
    if (this._hideNavbar) {
      const navbar = this.shadowRoot.querySelector('ace-navbar');
      if (navbar) {
        navbar.remove();
      }
    }
  }

  async _fetchParticipants() {
    try {
      const res = await fetch(this._backendUrl + `/room/${this._roomId}/participants`);
      if (!res.ok) throw await res.json();
      const { participants } = await res.json();
      this._participants = participants; // Direkt verwenden, da Backend neue Struktur sendet
      this._updateList();
    } catch (e) {
      console.error('Failed to load participants:', e);
    }
  }

  async _fetchItems() {
    try {
      const res = await fetch(this._backendUrl + `/room/${this._roomId}/items`);
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
      const res = await fetch(this._backendUrl + `/is-admin?roomId=${this._roomId}`);
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
    if(!this._listEl) return;
    this._listEl.innerHTML = this._participants
      .map(p => `
        <li class="${p.isAdmin ? 'admin-user' : 'regular-user'}">
          <span class="participant-name">
            ${p.name}
          </span>
          ${this._isAdmin && !p.isAdmin
            ? `<button class="ban-btn" data-name="${p.name}" title="Ban User">🔨</button>`
            : ''}
        </li>
      `).join('');

    // Event-Listener nach dem Rendern hinzufügen
    if (this._isAdmin) {
      this.shadowRoot.querySelectorAll('.ban-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
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

  async _onUserJoined(user) {
    console.log('User joined:', user);
    const userObj = { name: user, isAdmin: false }; // Neue User sind nie Admin
    this._participants.push(userObj);
    this._updateList();
  }

  async _onUserBanned(user) {
      console.log('User left:', user);
      this._participants = this._participants.filter(p => p.name !== user);
      this._updateList();
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
