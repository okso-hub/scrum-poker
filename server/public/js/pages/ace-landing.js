// public/js/components/ace-landing.js
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';
import { setupInputValidation, validateAndAlert } from '../utils/validation.js';

class AceLanding extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    /* Loads global styling & page-specific styling */
    const [landingStyles, landingTemplate] = await Promise.all([
      loadStylesheet('/css/landing.css'),
      loadTemplate('/html/ace-landing.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(landingStyles);
    this._template = landingTemplate;
    
    this._render();
    this._prefillGameId();
  }

  // if URL query params contain a gameId, it will be pre-filled on the page, allowing for a quicker join
  _prefillGameId() {
    const params = new URLSearchParams(window.location.search);
    const gameId = params.get('roomId') || params.get('gameId');

    console.log('game id is ' + gameId)

    if (gameId) {
      const gameEl = this.shadowRoot.getElementById("game-id-input");
      if (gameEl) gameEl.value = gameId;
    }
  }

  _render() {
    const html = interpolateTemplate(this._template, {});
    
    this.shadowRoot.innerHTML = html;

    const nameEl = this.shadowRoot.getElementById("user-name");
    const createBtn = this.shadowRoot.getElementById("create-game-button");
    const joinBtn = this.shadowRoot.getElementById("join-game-button");
    const gameEl = this.shadowRoot.getElementById("game-id-input");

    // Set up real-time validation using utility function
    setupInputValidation(nameEl, [createBtn, joinBtn], {
      allowEmpty: false,
      invalidMessage: 'Name contains invalid characters: < > &'
    });

    createBtn.onclick = () => {
      const name = nameEl.value.trim();
      
      // Validate name using utility function
      if (!validateAndAlert(name, "Name")) {
        return;
      }
      
      // event will render next page
      this.dispatchEvent(
        new CustomEvent("ace-create", {
          detail: { name },
          bubbles: true,
          composed: true,
        })
      );
    };

    joinBtn.onclick = () => {
      const name = nameEl.value.trim();
      const gameId = gameEl.value.trim();
      
      // Validate name using utility function
      if (!validateAndAlert(name, "Name")) {
        return;
      }
      
      if (!gameId) {
        alert("Please enter the Game-ID.");
        return;
      }

      // event will render next page
      this.dispatchEvent(
        new CustomEvent("ace-join", {
          detail: { name, gameId },
          bubbles: true,
          composed: true,
        })
      );
    };
  }
}

customElements.define("ace-landing", AceLanding);
