// public/js/components/ace-navbar.js

const navbarStyles = new CSSStyleSheet();
navbarStyles.replaceSync(`
:host {
  position: relative;
  display: block;
  font-family: sans-serif;
}
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #fff;
  border-bottom: 1px solid #ddd;
}
.info {
  font-size: 0.9rem;
}
button {
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  cursor: pointer;
}
#qrBtn, #copyBtn {
  margin-right: 0.5rem;
}
#settingsBtn {
  background: none;
  border: none;
  font-size: 1.5rem;
}
/* Sidebar */
#settingsSidebar {
  position: fixed;
  top: 0;
  right: 0;
  width: 300px;
  height: 100%;
  background: #fff;
  box-shadow: -2px 0 6px rgba(0,0,0,0.1);
  z-index: 150;
  transform: translateX(100%);
  transition: transform 0.3s ease;
  display: flex;
  flex-direction: column;
}
#settingsSidebar.open {
  transform: translateX(0);
}
#sidebarHeader {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
}
#sidebarHeader h2 {
  margin: 0;
  font-size: 1.2rem;
}
#sidebarClose {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
.settings-list {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}
.settings-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}
.settings-list li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}
.settings-list li:last-child {
  border-bottom: none;
}
.ban {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  font-size: 1.2rem;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  background: #f9f9f9;
  transition: background 0.1s ease;
}
.ban:hover {
  background: #efefef;
}
/* QR Popup overlay */
.popup {
  position: fixed;
  top: 0;
  left: 0;
  width:100%; height:100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items:center;
  justify-content:center;
  z-index: 200;
}
.popup.hidden {
  display: none;
}
.popup-content {
  position: relative;
  background: #fff;
  padding: 2rem 1rem 1rem;
  border-radius: 0.25rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.close-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1;
}
`);

class AceNavbar extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [navbarStyles];
    this._openSidebar = false;
    this._participants = [];
  }

  connectedCallback() {
    this._roomId  = this.getAttribute("room-id");
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
          <span>Game ID: ${this._roomId}</span>
        </div>
        <div>
          <button id="copyBtn">Copy URL</button>
          <button id="qrBtn">Show QR Code</button>
          ${this._isAdmin ? '<button id="settingsBtn" title="Settings">⚙️</button>' : ''}
        </div>
      </div>

      <!-- Sidebar -->
      <div id="settingsSidebar">
        <div id="sidebarHeader">
          <h2>Settings</h2>
          <button id="sidebarClose" aria-label="Close sidebar">&times;</button>
        </div>
        <div class="settings-list">
          <ul id="settingsList"></ul>
        </div>
      </div>

      <!-- QR code popup -->
      <div id="qrPopup" class="popup hidden">
        <div class="popup-content">
          <button id="closeQr" class="close-btn" aria-label="Close">&times;</button>
          <div id="qrcode"></div>
        </div>
      </div>
    `;
  }

  _wireUp() {
    const joinUrl = `${location.origin}${location.pathname}?roomId=${this._roomId}`;
    const copyBtn    = this.shadowRoot.getElementById("copyBtn");
    const qrBtn      = this.shadowRoot.getElementById("qrBtn");
    const qrPopup    = this.shadowRoot.getElementById("qrPopup");
    const closeQr    = this.shadowRoot.getElementById("closeQr");
    const settingsBtn= this.shadowRoot.getElementById("settingsBtn");
    const sidebar    = this.shadowRoot.getElementById("settingsSidebar");
    const sidebarClose = this.shadowRoot.getElementById("sidebarClose");
    const listEl     = this.shadowRoot.getElementById("settingsList");

    // Copy URL
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(joinUrl)
        .then(() => {
          copyBtn.textContent = "Copied!";
          copyBtn.style.color = "green";
          setTimeout(() => {
            copyBtn.textContent = "Copy URL";
            copyBtn.style.color = "";
          }, 2000);
        })
        .catch(() => {
          copyBtn.textContent = "Copy failed";
          copyBtn.style.color = "red";
          setTimeout(() => {
            copyBtn.textContent = "Copy URL";
            copyBtn.style.color = "";
          }, 2000);
        });
    });

    // QR code
    qrBtn.addEventListener("click", () => {
      this._loadQRScript().then(() => {
        qrPopup.classList.remove("hidden");
        const container = this.shadowRoot.getElementById("qrcode");
        container.innerHTML = "";
        new QRCode(container, { text: joinUrl, width:200, height:200, colorDark:"#000", colorLight:"#fff", correctLevel:QRCode.CorrectLevel.H });
      });
    });
    closeQr.addEventListener("click", () => qrPopup.classList.add("hidden"));

    // Settings sidebar
    if (this._isAdmin) {
      settingsBtn.addEventListener("click", async () => {
        if (!this._openSidebar) {
          await this._fetchParticipants();
          listEl.innerHTML = this._participants.map(name =>
            `<li><span>${name}</span><button class=\"ban\" data-name=\"${name}\">🔨</button></li>`
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

    // Escape closes
    this._escHandler = e => {
      if (e.key === 'Escape') {
        if (!qrPopup.classList.contains('hidden')) qrPopup.classList.add('hidden');
        if (this._openSidebar) { this._openSidebar = false; sidebar.classList.remove('open'); }
      }
    };
    document.addEventListener('keydown', this._escHandler);
  }

  disconnectedCallback() {
    document.removeEventListener('keydown', this._escHandler);
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
      // refresh participant list
      await this._fetchParticipants();
      // re-render sidebar
      const listEl = this.shadowRoot.getElementById("settingsList");
      listEl.innerHTML = this._participants.map(n =>
        `<li><span>${n}</span><button class=\"ban\" data-name=\"${n}\">🔨</button></li>`
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
