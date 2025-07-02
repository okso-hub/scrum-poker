// public/js/components/ace-settings.js
const settingsStyles = new CSSStyleSheet();
settingsStyles.replaceSync(`
:host {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: block;
  z-index: 100;
}
#btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
}
#menu {
  position: absolute;
  top: 2rem;
  right: 0;
  background: white;
  border: 1px solid #ccc;
  border-radius: 0.25rem;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
  display: none;
  flex-direction: column;
  min-width: 120px;
}
#menu button {
  background: none;
  border: none;
  padding: 0.5rem 1rem;
  text-align: left;
  cursor: pointer;
  font-size: 1rem;
}
#menu button:hover {
  background: #f0f0f0;
}
`);

class AceSettings extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [settingsStyles];
    this._open = false;
  }

  connectedCallback() {
    this._roomId = this.getAttribute("room-id");
    this._isAdmin = this.getAttribute("is-admin") === "true";
    if (!this._isAdmin) return;
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <button id="btn" title="Settings">⚙️</button>
      <div id="menu">
        <button id="banBtn">Ban User</button>
        <button id="editBtn">Edit Items</button>
      </div>
    `;
    this._btn = this.shadowRoot.getElementById("btn");
    this._menu = this.shadowRoot.getElementById("menu");
    this.shadowRoot.getElementById("banBtn").addEventListener("click", () => this._onBan());
    this.shadowRoot.getElementById("editBtn").addEventListener("click", () => this._onEdit());
    this._btn.addEventListener("click", () => this._toggleMenu());
    document.addEventListener("click", (e) => {
      if (this._open && !this.contains(e.target)) {
        this._closeMenu();
      }
    });
  }

  _toggleMenu() {
    this._open = !this._open;
    this._menu.style.display = this._open ? "flex" : "none";
  }

  _closeMenu() {
    this._open = false;
    this._menu.style.display = "none";
  }

  _onBan() {
    this._closeMenu();
    const ip = prompt("IP zum Bann eingeben:");
    if (!ip) return;
    this.dispatchEvent(
      new CustomEvent("ace-ban-user", {
        detail: { ip, roomId: this._roomId },
        bubbles: true,
        composed: true,
      })
    );
  }

  _onEdit() {
    this._closeMenu();
    this.dispatchEvent(
      new CustomEvent("ace-edit-items", {
        detail: { roomId: this._roomId },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define("ace-settings", AceSettings);
