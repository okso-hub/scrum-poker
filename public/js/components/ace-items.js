// public/js/components/ace-items.js
const itemsStyles = new CSSStyleSheet();
itemsStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
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
  max-height: 200px;
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
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [itemsStyles];
    this._items = [];
  }

  connectedCallback() {
    this._roomId = this.getAttribute('room-id');
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <h2>Items hinzufügen</h2>
      <div class="input-group">
        <input id="itemInput" type="text" placeholder="Neues Item…" />
        <button id="addBtn">Add</button>
      </div>
      <ul id="itemList"></ul>
      <button id="nextBtn">Next</button>
    `;

    this._inputEl = this.shadowRoot.getElementById('itemInput');
    this._addBtn  = this.shadowRoot.getElementById('addBtn');
    this._listEl  = this.shadowRoot.getElementById('itemList');
    this._nextBtn = this.shadowRoot.getElementById('nextBtn');

    this._addBtn.onclick  = () => this._onAdd();
    this._nextBtn.onclick = () => this._onNext();

    this._updateList();
  }

  _onAdd() {
    const text = this._inputEl.value.trim();
    if (!text) return;
    this._items.push(text);
    this._inputEl.value = '';
    this._inputEl.focus();
    this._updateList();
  }

  _updateList() {
    this._listEl.innerHTML = this._items
      .map((item, idx) =>
        `<li>
           <span>${item}</span>
           <span class="trash" data-idx="${idx}" title="Entfernen">🗑️</span>
         </li>`
      ).join('');

    // Trash-Handler setzen
    this.shadowRoot.querySelectorAll('.trash')
      .forEach(el => el.onclick = () => {
        const idx = Number(el.dataset.idx);
        this._items.splice(idx, 1);
        this._updateList();
      });

    // Scroll-to-bottom
    this._listEl.scrollTop = this._listEl.scrollHeight;
  }

  async _onNext() {
    if (this._items.length === 0) {
      alert('Bitte mindestens ein Item hinzufügen.');
      return;
    }
    try {
      const res = await fetch(`/room/${this._roomId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: this._items })  // Array wird so übergeben
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fehler beim Speichern der Items');
      }
      this.dispatchEvent(new CustomEvent('ace-items-submitted', {
        detail: { roomId: this._roomId, items: this._items },
        bubbles: true,
        composed: true
      }));
    } catch (e) {
      alert(e.message);
    }
  }
}

customElements.define('ace-items', AceItems);
