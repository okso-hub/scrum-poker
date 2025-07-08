import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._initialized = false;
  }

  async _initialize() {
    if (this._initialized) return;
    
    const modalStyles = await loadStylesheet('/css/modal.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(modalStyles);
    this._render();
    this._initialized = true;
  }

  async connectedCallback() {
    await this._initialize();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
          </div>
          <div class="modal-body"></div>
          <div class="modal-actions"></div>
        </div>
      </div>
    `;
  }

  async show(title, message, actions = [], parentElement = null) {
    await this._initialize();

    const titleEl = this.shadowRoot.querySelector('.modal-title');
    const bodyEl = this.shadowRoot.querySelector('.modal-body');
    const actionsEl = this.shadowRoot.querySelector('.modal-actions');

    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = message;
    
    if (actionsEl) {
      actionsEl.innerHTML = '';
      actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.text;
        button.className = action.type || 'secondary';
        button.addEventListener('click', () => {
          this.hide();
          if (action.handler) action.handler();
        });
        actionsEl.appendChild(button);
      });
    }

    // Append to parent element if provided, otherwise fallback to document.body
    (parentElement || document.body).appendChild(this);
    return this;
  }

  hide() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  static async show(title, message, actions = []) {
    const modal = new AceModal();
    return await modal.show(title, message, actions);
  }
}

customElements.define("ace-modal", AceModal);