// public/js/components/ace-landing.js
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceLanding extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Landing-Styles laden */
    const landingStyles = await loadStylesheet('/css/landing.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(landingStyles);
    
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
    this.shadowRoot.innerHTML = `
      <h2>AgileAce</h2>
      <div class="input-group">
        <label for="name">Your Name:</label>
        <input id="name" type="text" placeholder="z. B. Anna Mueller" />
      </div>
      <div class="actions">
        <div class="action card">
          <h3>Create Game</h3>
          <button id="create">Start Game as Admin</button>
        </div>
        <div class="action card">
          <h3>Join Game</h3>
          <div class="input-group">
            <label for="gameId">Game-ID:</label>
            <input id="gameId" type="text" placeholder="z. B. ABC123" />
          </div>
          <button id="join">Join</button>
        </div>
      </div>
    `;

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
