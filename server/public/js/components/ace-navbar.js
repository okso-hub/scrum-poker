import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._openSidebar = false;
    this._escHandler = null;
    this._infoEsc = null;
  }

  async connectedCallback() {
    /* Loads global styling & page-specific styling */
    const [navbarStyles, navbarTemplate] = await Promise.all([
      loadStylesheet('/css/navbar.css'),
      loadTemplate('/html/ace-navbar.html')
    ]);

    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(navbarStyles);
    this._template = navbarTemplate;

    this._roomId = this.getAttribute("room-id");
    this._isAdmin = this.getAttribute("is-admin") === "true";
    this._backendUrl = this.getAttribute("backend-url");
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
      const res = await fetch(this._backendUrl + `/room/${this._roomId}/participants`);
      if (!res.ok) throw new Error('Fetch failed');
      const { participants } = await res.json();
      this._participants = participants;
    } catch (e) {
      console.error('Could not load participants:', e);
      this._participants = [];
    }
  }

  _render() {
    // Loads templace
    const templateContent = this._template.content.cloneNode(true);

    // Inserts room ID in the template
    const roomIdElement = templateContent.querySelector('.room-id');
    roomIdElement.textContent = this._roomId;

    // Places template in shadow root
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(templateContent);

    // Render settings button only for the game admin
    if (this._isAdmin) {
      const actionButtonsEl = this.shadowRoot.querySelector('.action-buttons');
      const settingsBtn = document.createElement('button');
      settingsBtn.textContent = '⚙️';
      settingsBtn.type = 'button';
      settingsBtn.id = 'settings-btn';
      settingsBtn.className = 'settings-btn';
      settingsBtn.setAttribute('aria-label', 'open settings');
      actionButtonsEl.appendChild(settingsBtn);
    }
  }

  _wireUp() {
    const joinUrl = `${location.origin}${location.pathname}?roomId=${this._roomId}`;

    const copyIdBtn = this.shadowRoot.getElementById("copy-id-btn");
    const copyBtn = this.shadowRoot.getElementById("copy-btn");
    const qrBtn = this.shadowRoot.getElementById("qr-btn");
    const qrPopup = this.shadowRoot.getElementById("qr-popup");
    const closeQr = this.shadowRoot.getElementById("qr-close");
    const infoBtn = this.shadowRoot.getElementById("info-btn");
    const infoPopup = this.shadowRoot.getElementById("info-popup");
    const closeInfo = this.shadowRoot.getElementById("info-close");
    const settingsBtn = this.shadowRoot.getElementById("settings-btn");
    const sidebar = this.shadowRoot.getElementById("settings-sidebar");
    const sidebarClose = this.shadowRoot.getElementById("sidebar-close");
    const listEl = this.shadowRoot.getElementById("participants-list");

    // Copy Game ID
    copyIdBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(this._roomId)
        .then(() => {
          // Success animation
          copyIdBtn.textContent = '✅';
          copyIdBtn.style.transform = 'scale(1.2)';
          setTimeout(() => { copyIdBtn.textContent = '📋'; copyIdBtn.style.transform = ''; }, 1000);
        })
        .catch(() => {
          // Failure animation
          copyIdBtn.textContent = '❌';
          copyIdBtn.style.transform = 'scale(1.2)';
          setTimeout(() => { copyIdBtn.textContent = '📋'; copyIdBtn.style.transform = ''; }, 1000);
        });
    });

    // Copy URL button handler
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

    // QR Code Popup handler
    qrBtn.addEventListener("click", () => {
      this._loadQRScript().then(() => {
        qrPopup.classList.remove("hidden");
        const container = this.shadowRoot.getElementById("qrcode");
        container.innerHTML = "";
        new QRCode(container, { text: joinUrl, width: 200, height: 200, correctLevel: QRCode.CorrectLevel.H });
      });
    });
    closeQr.addEventListener("click", () => qrPopup.classList.add("hidden"));
    qrPopup.addEventListener('click', e => { if (e.target === qrPopup) qrPopup.classList.add('hidden'); });

    // Info Popup handler
    infoBtn.addEventListener("click", () => infoPopup.classList.remove("hidden"));
    closeInfo.addEventListener("click", () => infoPopup.classList.add("hidden"));
    infoPopup.addEventListener("click", e => { if (e.target === infoPopup) infoPopup.classList.add("hidden"); });

    // Settings Sidebar (visible for game admin only)
    if (this._isAdmin && settingsBtn) {
      settingsBtn.addEventListener("click", async () => {
        if (!this._openSidebar) {
          await this._fetchParticipants();

          // display all participants fetched from backend as list items
          listEl.innerHTML = this._participants.map(p =>
            `<li class="${p.isAdmin ? 'admin-user' : 'regular-user'}">
              <span class="participant-name">
                ${p.name}
              </span>
              ${!p.isAdmin ? `<button class="ban" data-name="${p.name}" title="Ban User">🔨</button>` : ''}
            </li>`
          ).join('');

          // handle ban button clicks
          this.shadowRoot.querySelectorAll('button.ban').forEach(btn => {
            btn.addEventListener('click', e => this._banUser(e.currentTarget.dataset.name));
          });
        }
        // toggling of sidebar
        this._openSidebar = !this._openSidebar;
        sidebar.classList.toggle('open', this._openSidebar);
      });
      sidebarClose.addEventListener("click", () => {
        this._openSidebar = false;
        sidebar.classList.remove('open');
      });
    }

    // Escape key handler for QR, Sidebar & Info
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

  async _banUser(name) {
    if (!name) return;
    if (!confirm(`Really ban "${name}"?`)) return;

    try {
      const res = await fetch(this._backendUrl + `/room/${this._roomId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      // If unsuccesful, the body will contain the error in JSON format
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

      // add event listener to button
      this.shadowRoot.querySelectorAll('button.ban').forEach(btn => {
        btn.addEventListener('click', e => this._banUser(e.currentTarget.dataset.name));
      });
    } catch (err) {
      alert(err.error || err.message || 'Ban failed');
    }
  }
}

customElements.define("ace-navbar", AceNavbar);
