import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';
import { setupInputValidation, validateAndAlert, hasDangerousCharacters } from '../utils/validation.js';

class AceItems extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = [];
    this._roomId = "";
    this._isAdmin = false;
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Items-Styles laden */
    const [itemsStyles, itemsTemplate] = await Promise.all([
      loadStylesheet('/css/items.css'),
      loadTemplate('/html/ace-items.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(itemsStyles);
    this._template = itemsTemplate;
    
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
    const html = interpolateTemplate(this._template, {
      roomId: this._roomId,
      isAdmin: this._isAdmin
    });
    
    this.shadowRoot.innerHTML = html;

    this._inputEl = this.shadowRoot.getElementById("item-input");
    this._addBtn = this.shadowRoot.getElementById("add-item-button");
    this._listEl = this.shadowRoot.getElementById("item-list");
    this._nextBtn = this.shadowRoot.getElementById("next-button");

    // Set up real-time validation using utility function
    setupInputValidation(this._inputEl, this._addBtn, {
      allowEmpty: false,
      invalidMessage: 'Item contains invalid characters: < > &'
    });

    // Pressing Enter: if input has text, add; if empty, proceed to next
    this._inputEl.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        const text = this._inputEl.value.trim();
        if (text && !hasDangerousCharacters(text)) {
          this._onAdd();
        } else if (!text) {
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
    
    // Validate text using utility function
    if (!validateAndAlert(text, "Item")) {
      return;
    }
    
    if (this._items.some(item => item.toLowerCase() === text.toLowerCase())) {
      alert("This item exists already.");
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
        <li class="list-item">
          <span>${item}</span>
          <span class="trash" data-idx="${idx}" title="Remove">🗑️</span>
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
      alert("Please add at least one item.");
      return;
    }
    try {
      const res = await fetch(`/room/${this._roomId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: this._items })
      });
      if (!res.ok) throw new Error("Error when saving items.");
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