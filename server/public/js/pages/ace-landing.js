// public/js/components/ace-landing.js
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceLanding extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Landing-Styles laden */
    const [landingStyles, landingTemplate] = await Promise.all([
      loadStylesheet('/css/landing.css'),
      loadTemplate('/html/ace-landing.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(landingStyles);
    this._template = landingTemplate;
    
    this._render();
    this._prefillRoomId();
  }

  _prefillRoomId() {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('roomId') || params.get('gameId');
    if (roomId) {
      const gameEl = this.shadowRoot.getElementById("gameId");
      if (gameEl) gameEl.value = roomId;
    }
  }

  _render() {
    const html = interpolateTemplate(this._template, {});
    
    this.shadowRoot.innerHTML = html;

    const nameEl = this.shadowRoot.getElementById("name");
    const createBtn = this.shadowRoot.getElementById("create");
    const joinBtn = this.shadowRoot.getElementById("join");
    const gameEl = this.shadowRoot.getElementById("gameId");

    createBtn.onclick = () => {
      const name = nameEl.value.trim();
      if (!name) {
        alert("Please enter your name.");
        return;
      }
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
      if (!name) {
        alert("Please enter your name.");
        return;
      }
      if (!gameId) {
        alert("Please enter the Game-ID.");
        return;
      }
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
