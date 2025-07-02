import "../components/ace-settings.js";

const itemsStyles = new CSSStyleSheet();
itemsStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
  position: relative;
}
h2 {
  text-align: center;
  margin-bottom: 1rem;
}
.input-group {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}
.input-group input {
  flex: 1;
  padding: 0.5rem;
  font-size: 1rem;
}
.input-group button {
  padding: 0.5rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
#itemList {
  max-height: 50vh;       /* cap at half the viewport height */
  overflow-y: auto;       /* scroll once it fills up */
  margin-bottom: 1rem;
  padding: 0;
  list-style: none;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
#itemList li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}
#itemList li:last-child {
  border-bottom: none;
}
.trash {
  cursor: pointer;
  margin-left: 0.5rem;
  font-size: 1.1rem;
}
button#nextBtn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}
`);

class AceItems extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.shadowRoot.adoptedStyleSheets = [itemsStyles];
    this._items = [];
    this._roomId = "";
    this._isAdmin = false;
  }

  async connectedCallback() {
    this._roomId = this.getAttribute("room-id") || "";
    this._isAdmin = this.getAttribute("is-admin") === "true";
    console.log("AceItems.connectedCallback:", { roomId: this._roomId, isAdmin: this._isAdmin });
    await this._loadItems();
    this._render();
  }

  async _loadItems() {
    console.log("AceItems._loadItems: fetching items for room", this._roomId);
    try {
      const res = await fetch(`/room/${this._roomId}/items`);
      if (res.ok) {
        const { items } = await res.json();
        console.log("AceItems._loadItems: received items", items);
        this._items = items;
      } else {
        console.warn("AceItems._loadItems: server returned", res.status);
      }
    } catch (e) {
      console.error("AceItems._loadItems: network error", e);
    }
  }

  _render() {
    console.log("AceItems._render: rendering UI, items count =", this._items.length);
    this.shadowRoot.innerHTML = `
      <div id="settingsContainer"></div>
      <h2>Items hinzufügen</h2>
      <div class="input-group">
        <input id="itemInput" type="text" placeholder="Neues Item…" />
        <button id="addBtn">Add</button>
      </div>
      <ul id="itemList"></ul>
      <button id="nextBtn">Next</button>
    `;
    console.log("is admin", this._isAdmin);
    if (this._isAdmin) {
      console.log("AceItems._render: injecting ace-settings");
      const container = this.shadowRoot.getElementById("settingsContainer");
      const settings = document.createElement("ace-settings");
      settings.setAttribute("room-id", this._roomId);
      settings.setAttribute("is-admin", "true");
      console.log("settings: ", settings);
      container.appendChild(settings);
    }

    this._inputEl = this.shadowRoot.getElementById("itemInput");
    this._addBtn = this.shadowRoot.getElementById("addBtn");
    this._listEl = this.shadowRoot.getElementById("itemList");
    this._nextBtn = this.shadowRoot.getElementById("nextBtn");

    this._inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this._onAdd();
      }
    });

    this._addBtn.addEventListener("click", () => this._onAdd());
    this._nextBtn.addEventListener("click", () => this._onNext());

    this._updateList();
  }

  _onAdd() {
    console.log("AceItems._onAdd: adding item", this._inputEl.value);
    const text = this._inputEl.value.trim();
    if (!text) return;
    // Check for uniqueness (case-insensitive)
    const exists = this._items.some(item => item.toLowerCase() === text.toLowerCase());
    if (exists) {
      alert("Dieses Item existiert bereits.");
      this._inputEl.value = "";
      this._inputEl.focus();
      return;
    }
    this._items.push(text);
    this._inputEl.value = "";
    this._inputEl.focus();
    this._updateList();
  }

  _updateList() {
    console.log("AceItems._updateList: items =", this._items);
    this._listEl.innerHTML = this._items
      .map(
        (item, idx) => `
      <li>
        <span>${item}</span>
        <span class="trash" data-idx="${idx}" title="Entfernen">🗑️</span>
      </li>
    `
      )
      .join("\n");

    this.shadowRoot.querySelectorAll(".trash").forEach(el => {
      el.addEventListener("click", () => {
        const idx = Number(el.dataset.idx);
        console.log("AceItems._updateList: removing index", idx);
        this._items.splice(idx, 1);
        this._updateList();
      });
    });
  }

  async _onNext() {
    console.log("AceItems._onNext: submitting items", this._items);
    if (this._items.length === 0) {
      alert("Bitte mindestens ein Item hinzufügen.");
      return;
    }
    try {
      const res = await fetch(`/room/${this._roomId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: this._items }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Fehler beim Speichern der Items");
      }
      console.log("AceItems._onNext: submission successful");
      this.dispatchEvent(
        new CustomEvent("ace-items-submitted", {
          detail: { roomId: this._roomId, items: this._items },
          bubbles: true,
          composed: true,
        })
      );
    } catch (e) {
      console.error("AceItems._onNext: error", e);
      alert(e.message);
    }
  }
}

customElements.define("ace-items", AceItems);
