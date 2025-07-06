import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSidebar = false;
    this._escHandler = null;
    this._infoEsc = null;
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Navbar-Styles laden */
    const navbarStyles = await loadStylesheet('/css/navbar.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(navbarStyles);
    
    this._roomId = this.getAttribute("room-id");
    this._isAdmin = this.getAttribute("is-admin") === "true";
    this._render();
    this._wireUp();
  }

  _loadQRScript() {
    if (window.QRCode) return Promise.resolve();
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async _fetchParticipants() {
    try {
      const res = await fetch(`/room/${this._roomId}/participants`);
      if (!res.ok) throw new Error('Fetch failed');
      const { participants } = await res.json();
      this._participants = participants;
    } catch (e) {
      console.error('Could not load participants:', e);
      this._participants = [];
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <div class="navbar">
        <div class="info">
          <span>Room: <strong>${this._roomId}</strong></span>
          <button id="copyIdBtn" class="copy-id-btn" title="Copy Room ID">📋</button>
        </div>
        <div class="action-buttons">
          <button id="qrBtn">QR</button>
          <button id="copyBtn">Copy Link</button>
          <button id="infoBtn">Info</button>
          <button id="settingsBtn" class="settings-btn">⚙️</button>
        </div>
      </div>

      <div id="settingsSidebar" class="settings-sidebar">
        <div class="sidebar-header">
          <h2>Settings</h2>
          <button id="sidebarClose" class="sidebar-close">×</button>
        </div>
        <div class="settings-list">
          <ul id="participantsList"></ul>
        </div>
      </div>

      <div id="qrPopup" class="popup hidden">
        <div class="popup-content">
          <button class="close-btn" id="qrClose">×</button>
          <div id="qrcode"></div>
        </div>
      </div>

      <div id="infoPopup" class="info-popup hidden">
        <div class="popup-content">
          <button class="close-btn" id="infoClose">×</button>
          <h2>How to Play</h2>
          <p>This is a Planning Poker game for agile teams.</p>
          <h3>Steps:</h3>
          <ol>
            <li>The admin creates items to estimate</li>
            <li>All players vote on each item</li>
            <li>Votes are revealed and discussed</li>
            <li>Continue until all items are estimated</li>
          </ol>
          <h3>Voting Values:</h3>
          <p>Use the Fibonacci sequence: 1, 2, 3, 5, 8, 13, 21</p>
          <ul>
            <li><strong>1-3:</strong> Small tasks</li>
            <li><strong>5-8:</strong> Medium tasks</li>
            <li><strong>13-21:</strong> Large tasks</li>
          </ul>
        </div>
      </div>
    `;
  }

  _wireUp() {
    const joinUrl = `${location.origin}${location.pathname}?roomId=${this._roomId}`;
    const copyIdBtn = this.shadowRoot.getElementById("copyIdBtn");
    const copyBtn   = this.shadowRoot.getElementById("copyBtn");
    const qrBtn     = this.shadowRoot.getElementById("qrBtn");
    const qrPopup   = this.shadowRoot.getElementById("qrPopup");
    const closeQr   = this.shadowRoot.getElementById("qrClose");
    const infoBtn   = this.shadowRoot.getElementById("infoBtn");
    const infoPopup = this.shadowRoot.getElementById("infoPopup");
    const closeInfo = this.shadowRoot.getElementById("infoClose");
    const settingsBtn = this.shadowRoot.getElementById("settingsBtn");
    const sidebar     = this.shadowRoot.getElementById("settingsSidebar");
    const sidebarClose = this.shadowRoot.getElementById("sidebarClose");
    const listEl      = this.shadowRoot.getElementById("participantsList");

    // Copy Game ID
    copyIdBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this._roomId)
        .then(() => {
          copyIdBtn.textContent = '✅';
          copyIdBtn.style.transform = 'scale(1.2)';
          setTimeout(() => { copyIdBtn.textContent = '📋'; copyIdBtn.style.transform = ''; }, 1000);
        })
        .catch(() => {
          copyIdBtn.textContent = '❌';
          copyIdBtn.style.transform = 'scale(1.2)';
          setTimeout(() => { copyIdBtn.textContent = '📋'; copyIdBtn.style.transform = ''; }, 1000);
        });
    });

    // Copy URL
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(joinUrl)
        .then(() => {
          copyBtn.textContent = "Copied!";
          copyBtn.style.color = "green";
          setTimeout(() => { copyBtn.textContent = "Copy Join URL"; copyBtn.style.color = ""; }, 2000);
        })
        .catch(() => {
          copyBtn.textContent = "Copy failed";
          copyBtn.style.color = "red";
          setTimeout(() => { copyBtn.textContent = "Copy Join URL"; copyBtn.style.color = ""; }, 2000);
        });
    });

    // QR Code Popup
    qrBtn.addEventListener("click", () => {
      this._loadQRScript().then(() => {
        qrPopup.classList.remove("hidden");
        const container = this.shadowRoot.getElementById("qrcode");
        container.innerHTML = "";
        new QRCode(container, { text: joinUrl, width:200, height:200, correctLevel: QRCode.CorrectLevel.H });
      });
    });
    closeQr.addEventListener("click", () => qrPopup.classList.add("hidden"));
    qrPopup.addEventListener('click', e => { if (e.target === qrPopup) qrPopup.classList.add('hidden'); });

    // Info Popup
    infoBtn.addEventListener("click", () => infoPopup.classList.remove("hidden"));
    closeInfo.addEventListener("click", () => infoPopup.classList.add("hidden"));
    infoPopup.addEventListener("click", e => { if (e.target === infoPopup) infoPopup.classList.add("hidden"); });

    // Settings Sidebar (admin only)
    if (this._isAdmin && settingsBtn) {
      settingsBtn.addEventListener("click", async () => {
        if (!this._openSidebar) {
          await this._fetchParticipants();
          listEl.innerHTML = this._participants.map(p =>
            `<li class="${p.isAdmin ? 'admin-user' : 'regular-user'}">
              <span class="participant-name">
                ${p.name}
              </span>
              ${!p.isAdmin ? `<button class="ban" data-name="${p.name}" title="Ban User">🔨</button>` : ''}
            </li>`
          ).join('');
          this.shadowRoot.querySelectorAll('button.ban').forEach(btn => {
            btn.addEventListener('click', e => this._onBan(e.currentTarget.dataset.name));
          });
        }
        this._openSidebar = !this._openSidebar;
        sidebar.classList.toggle('open', this._openSidebar);
      });
      sidebarClose.addEventListener("click", () => {
        this._openSidebar = false;
        sidebar.classList.remove('open');
      });
    }

    // Escape key handler for QR, Sidebar, Info
    this._escHandler = e => {
      if (e.key === 'Escape') {
        if (!qrPopup.classList.contains('hidden')) qrPopup.classList.add('hidden');
        if (this._openSidebar) { this._openSidebar = false; sidebar.classList.remove('open'); }
      }
    };
    this._infoEsc = e => {
      if (e.key === 'Escape' && !infoPopup.classList.contains('hidden'))
        infoPopup.classList.add('hidden');
    };
    document.addEventListener('keydown', this._escHandler);
    document.addEventListener('keydown', this._infoEsc);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._escHandler);
    document.removeEventListener('keydown', this._infoEsc);
  }

  async _onBan(name) {
    if (!name) return;
    if (!confirm(`Really ban "${name}"?`)) return;
    try {
      const res = await fetch(`/room/${this._roomId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
      if (!res.ok) throw await res.json();
      await this._fetchParticipants();
      const listEl = this.shadowRoot.getElementById("participantsList");
      listEl.innerHTML = this._participants.map(p =>
        `<li class="${p.isAdmin ? 'admin-user' : 'regular-user'}">
          <span class="participant-name">
            ${p.name}
          </span>
          ${!p.isAdmin ? `<button class="ban" data-name="${p.name}" title="Ban User">🔨</button>` : ''}
        </li>`
      ).join('');
      this.shadowRoot.querySelectorAll('button.ban').forEach(btn => {
        btn.addEventListener('click', e => this._onBan(e.currentTarget.dataset.name));
      });
    } catch (err) {
      alert(err.error || err.message || 'Ban failed');
    }
  }
}

customElements.define("ace-navbar", AceNavbar);
