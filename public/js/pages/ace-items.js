import "../components/ace-navbar.js";

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
  max-height: 50vh;
  overflow-y: auto;
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
    await this._loadItems();
    this._render();
  }

  async _loadItems() {
    try {
      const res = await fetch(`/room/${this._roomId}/items`);
      if (res.ok) {
        const { items } = await res.json();
        this._items = items;
      }
    } catch (e) {
      console.error("Error loading items:", e);
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <ace-navbar room-id="${this._roomId}" is-admin="${this._isAdmin}"></ace-navbar>
      <h2>Items hinzufügen</h2>
      <div class="input-group">
        <input id="itemInput" type="text" placeholder="Neues Item…" />
        <button id="addBtn">Add</button>
      </div>
      <ul id="itemList"></ul>
      <button id="nextBtn">Next</button>
    `;

    this._inputEl = this.shadowRoot.getElementById("itemInput");
    this._addBtn = this.shadowRoot.getElementById("addBtn");
    this._listEl = this.shadowRoot.getElementById("itemList");
    this._nextBtn = this.shadowRoot.getElementById("nextBtn");

    // Pressing Enter: if input has text, add; if empty, proceed to next
    this._inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const text = this._inputEl.value.trim();
        if (text) {
          this._onAdd();
        } else {
          this._onNext();
        }
      }
    });
    this._addBtn.addEventListener("click", () => this._onAdd());
    this._nextBtn.addEventListener("click", () => this._onNext());

    this._updateList();
  }

  _onAdd() {
    const text = this._inputEl.value.trim();
    if (!text) return;
    if (this._items.some(item => item.toLowerCase() === text.toLowerCase())) {
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
    this._listEl.innerHTML = this._items
      .map((item, idx) => `
        <li>
          <span>${item}</span>
          <span class="trash" data-idx="${idx}" title="Entfernen">🗑️</span>
        </li>
      `)
      .join('');

    this.shadowRoot.querySelectorAll(".trash").forEach(el => {
      el.addEventListener("click", () => {
        const idx = Number(el.dataset.idx);
        this._items.splice(idx, 1);
        this._updateList();
      });
    });
  }

  async _onNext() {
    if (this._items.length === 0) {
      alert("Bitte mindestens ein Item hinzufügen.");
      return;
    }
    try {
      const res = await fetch(`/room/${this._roomId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: this._items })
      });
      if (!res.ok) throw new Error("Fehler beim Speichern der Items");
      this.dispatchEvent(
        new CustomEvent("ace-items-submitted", {
          detail: { roomId: this._roomId, items: this._items },
          bubbles: true,
          composed: true
        })
      );
    } catch (e) {
      alert(e.message);
      console.error("Submission error:", e);
    }
  }
}

customElements.define("ace-items", AceItems);
