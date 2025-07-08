import "../components/ace-navbar.js";
import "../components/ace-modal.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';
import { setupInputValidation, validateAndAlert, hasDangerousCharacters } from '../utils/validation.js';

class AceItems extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._items = [];
    this._gameId = null;
    this._isAdmin = false;
    this._hideNavbar = false;
  }

  async connectedCallback() {
    /* Loads global styling & page-specific styling */
    const [itemsStyles, itemsTemplate] = await Promise.all([
      loadStylesheet('/css/items.css'),
      loadTemplate('/html/ace-items.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(itemsStyles);
    this._template = itemsTemplate;
    
    this._gameId = Number(this.getAttribute("game-id")) || null;
    this._isAdmin = this.getAttribute("is-admin") === "true";
    this._backendUrl = this.getAttribute("backend-url");
    this._hideNavbar = this.getAttribute("hide-navbar") === "true";
    
    await this._loadItems();
    
    // Load default items if no items exist and defaults are provided
    this._loadDefaultItems();
    
    this._render();
  }

  // Fetches backlog items added by admin
  async _loadItems() {
    try {
      const res = await fetch(this._backendUrl + `/room/${this._gameId}/items`);
      if (res.ok) {
        const { items } = await res.json();
        this._items = items;
      }
    } catch (e) {
      console.error("Error loading items:", e);
    }
  }

  _loadDefaultItems() {
    if (this._items.length === 0) {
      const defaultItemsAttr = this.getAttribute("default-items");
      if (defaultItemsAttr) {
        try {
          const defaultData = JSON.parse(defaultItemsAttr);
          if (defaultData.items && Array.isArray(defaultData.items)) {
            this._items = defaultData.items.filter(item => 
              typeof item === 'string' && item.trim() !== '' && !hasDangerousCharacters(item)
            );
            console.log("Loaded default items:", this._items);
          }
        } catch (e) {
          console.error("Error parsing default items:", e);
        }
      }
    }
  }

  _render() {
    const html = interpolateTemplate(this._template, {
      gameId: this._gameId,
      isAdmin: this._isAdmin,
      backendUrl: this._backendUrl
    });
    
    this.shadowRoot.innerHTML = html;

    // Remove navbar if hide-navbar is true
    if (this._hideNavbar) {
      const navbar = this.shadowRoot.querySelector('ace-navbar');
      if (navbar) {
        navbar.remove();
      }
    }

    this._inputEl = this.shadowRoot.getElementById("item-input");
    this._addBtn = this.shadowRoot.getElementById("add-item-button");
    this._listEl = this.shadowRoot.getElementById("item-list");
    this._nextBtn = this.shadowRoot.getElementById("next-button");

    // Set up import/export button event listeners
    this.shadowRoot.getElementById('export-button').addEventListener('click', () => this._exportItems());
    this.shadowRoot.getElementById('import-button').addEventListener('click', () => this._triggerImport());
    this.shadowRoot.getElementById('file-input').addEventListener('change', (e) => this._importItems(e));

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

  _exportItems() {
    if (this._items.length === 0) {
      alert("No items to export.");
      return;
    }

    const exportData = {
      items: this._items,
      exportDate: new Date().toISOString(),
      gameId: this._gameId
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `scrum-items-${this._gameId || 'export'}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  _triggerImport() {
    const fileInput = this.shadowRoot.getElementById('file-input');
    fileInput.value = ''; // Reset value to allow re-importing same file
    fileInput.click();
  }

  async _importItems(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error("Invalid file format. Expected JSON with 'items' array.");
      }

      // Validate items
      const validItems = data.items.filter(item => {
        if (typeof item !== 'string' || item.trim() === '') return false;
        if (hasDangerousCharacters(item)) return false;
        return true;
      });

      if (validItems.length === 0) {
        alert("No valid items found in the imported file.");
        return;
      }

      // Show custom modal for better UX
      await this._showImportModal(validItems);

    } catch (error) {
      alert(`Error importing file: ${error.message}`);
      console.error("Import error:", error);
    } finally {
      // Reset file input
      event.target.value = '';
    }
  }

  async _showImportModal(validItems) {
    const itemCount = validItems.length;
    const currentCount = this._items.length;
    
    const modal = document.createElement('ace-modal');
    await modal.show(
      'Import Items',
      `Found <strong>${itemCount}</strong> valid items in the file.<br>
       You currently have <strong>${currentCount}</strong> items.<br><br>
       How would you like to import these items?`,
      [
        {
          text: 'Replace All',
          type: 'danger',
          handler: () => {
            this._items = validItems;
            this._updateList();
            this._showSuccessMessage(itemCount, 'replaced');
          }
        },
        {
          text: 'Add to Existing',
          type: 'primary',
          handler: () => {
            const initialCount = this._items.length;
            validItems.forEach(item => {
              if (!this._items.some(existing => existing.toLowerCase() === item.toLowerCase())) {
                this._items.push(item);
              }
            });
            const addedCount = this._items.length - initialCount;
            this._updateList();
            this._showSuccessMessage(addedCount, 'added');
          }
        },
        {
          text: 'Cancel',
          type: 'secondary',
          handler: () => {} // Just closes modal
        }
      ]
    );
  }

  async _showSuccessMessage(count, action) {
    const modal = document.createElement('ace-modal');
    await modal.show(
      'Import Successful',
      `Successfully ${action} <strong>${count}</strong> items.`,
      [
        {
          text: 'OK',
          type: 'primary',
          handler: () => {}
        }
      ]
    );
  }

  // adds new items to list
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

  // refreshes the shown list
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
      const res = await fetch(this._backendUrl + `/room/${this._gameId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: this._items })
      });

      if (!res.ok) throw new Error("Error when saving items.");

      this.dispatchEvent(
        new CustomEvent("ace-items-submitted", {
          detail: { gameId: this._gameId, items: this._items },
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