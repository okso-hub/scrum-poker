import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';
import { createToastHelper } from "../utils/shadow-toast.js";

class AceNavbar extends HTMLElement {
  static get observedAttributes() {
    return ['game-id', 'is-admin', 'backend-url'];
  }

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
    
    this._isAdmin = this.getAttribute("is-admin") === "true";
    
    this._render();
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
    // Always get fresh values from attributes to avoid context loss
    let backendUrl = this.getAttribute("backend-url");
    const gameId = Number(this.getAttribute("game-id"));
    
    if (backendUrl === "undefined" || backendUrl === "null") {
      backendUrl = null;
    }
    
    if (!backendUrl || !gameId) {
      console.error('Missing required attributes for participant fetch:', { backendUrl, gameId });
      this._participants = [];
      return;
    }
    
    try {
      const url = `${backendUrl}/room/${gameId}/participants`;
      const res = await fetch(url);
      
      if (!res.ok) {
        const err = await res.json();
        createToastHelper(this, err.message, "error", 3000);
        return;
      }

      const { participants } = await res.json();
      this._participants = participants;
    } catch (err) {
      console.error('Could not load participants:', err);
      createToastHelper(this, err.message, "error", 3000);

      this._participants = [];
    }
  }

  _render() {
    const gameId = Number(this.getAttribute("game-id"));
    
    const templateContent = this._template.content.cloneNode(true);

    const gameIdElement = templateContent.querySelector('.game-id');
    gameIdElement.textContent = gameId.toString();
    
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.appendChild(templateContent);

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
    
    this._wireUp();
  }

  _wireUp() {
    const gameId = Number(this.getAttribute("game-id"));
    const joinUrl = `${location.origin}${location.pathname}?gameId=${gameId}`;

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
      navigator.clipboard.writeText(gameId.toString())
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
              <p class="participant-name">
                ${p.name}
              </p>
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

  setMinimalMode(isMinimal) {
    console.log('setMinimalMode called with:', isMinimal);
    
    const trySetMode = () => {
      const navbar = this.shadowRoot.querySelector('.navbar');
      const infoDiv = this.shadowRoot.querySelector('.info');
      const actionButtonsDiv = this.shadowRoot.querySelector('.action-buttons');
      
      console.log('Found elements:', { navbar, infoDiv, actionButtonsDiv });
      
      if (navbar && infoDiv && actionButtonsDiv) {
        if (isMinimal) {
          console.log('Setting minimal mode: hiding elements and adding minimal class');
          navbar.classList.add('minimal');
          infoDiv.style.setProperty('display', 'none');
          actionButtonsDiv.style.setProperty('display', 'none');
        } else {
          console.log('Setting full mode: showing elements and removing minimal class');
          navbar.classList.remove('minimal');
          infoDiv.style.display = '';
          actionButtonsDiv.style.display = '';
        }
        return true;
      }
      return false;
    };
    
    // Try immediately first
    if (trySetMode()) return;
    
    // If elements not found, wait and observe
    const observer = new MutationObserver(() => {
      if (trySetMode()) {
        observer.disconnect();
      }
    });
    
    observer.observe(this.shadowRoot, { 
      childList: true, 
      subtree: true 
    });
    
    // Fallback timeout
    setTimeout(() => {
      observer.disconnect();
      if (!trySetMode()) {
        console.error('Could not find navbar elements for minimal mode after timeout');
      }
    }, 1000);
  }

  disconnectedCallback() {
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
    }
    if (this._infoEsc) {
      document.removeEventListener('keydown', this._infoEsc);
    }
  }

  async _banUser(name) {
    if (!name) return;
    if (!confirm(`Really ban "${name}"?`)) return;

    let backendUrl = this.getAttribute("backend-url");
    const gameId = Number(this.getAttribute("game-id"));
    
    // Handle case where backendUrl is string "undefined" or "null"
    if (backendUrl === "undefined" || backendUrl === "null") {
      console.error('Invalid backend URL for ban operation:', backendUrl);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/room/${gameId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });

      if (!res.ok) {
        createToastHelper(this, res.message, "error", 3000);
        return;
      }

      await this._fetchParticipants();
      const listEl = this.shadowRoot.getElementById("participantsList");
      
      if (listEl) {
        listEl.innerHTML = this._participants.map(p =>
          `<li class="${p.isAdmin ? 'admin-user' : 'regular-user'}">
            <span class="participant-name">
              ${p.name}
            </span>
            ${!p.isAdmin ? `<button class="ban" data-name="${p.name}" title="Ban User">🔨</button>` : ''}
          </li>`
        ).join('');

        this.shadowRoot.querySelectorAll('button.ban').forEach(btn => {
          btn.addEventListener('click', e => this._banUser(e.currentTarget.dataset.name));
        });
      } else {
        console.log('Participants list not found - user might not be in lobby');
      }
    } catch (err) {
      createToastHelper(this, err.message, "error", 3000);
    }
  }
}

customElements.define("ace-navbar", AceNavbar);
