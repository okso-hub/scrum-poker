// public/js/components/ace-landing.js
const landingStyles = new CSSStyleSheet();
landingStyles.replaceSync(`
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
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
}
.input-group label {
  margin-bottom: .25rem;
}
.input-group input {
  padding: .5rem;
  font-size: 1rem;
}
.actions {
  display: flex;
  gap: 1rem;
}
.action {
  flex: 1;
  border: 1px solid #ccc;
  border-radius: .5rem;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}
.action h3 {
  margin-top: 0;
  margin-bottom: .5rem;
  font-size: 1.1rem;
  text-align: center;
}
.action button {
  width: 100%;
  padding: .75rem;
  font-size: 1rem;
  cursor: pointer;
  margin-top: .5rem;
}
`);

class AceLanding extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [landingStyles];
  }

  connectedCallback() {
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <h2>AgileAce</h2>
      <div class="input-group">
        <label for="name">Dein Name:</label>
        <input id="name" type="text" placeholder="z. B. Anna Müller" />
      </div>
      <div class="actions">
        <div class="action create">
          <h3>Spiel erstellen</h3>
          <button id="create">Als Admin starten</button>
        </div>
        <div class="action join">
          <h3>Spiel beitreten</h3>
          <div class="input-group">
            <label for="gameId">Spiel-ID:</label>
            <input id="gameId" type="text" placeholder="z. B. ABC123" />
          </div>
          <button id="join">Beitreten</button>
        </div>
      </div>
    `;

    const nameEl    = this.shadowRoot.getElementById('name');
    const createBtn = this.shadowRoot.getElementById('create');
    const joinBtn   = this.shadowRoot.getElementById('join');
    const gameEl    = this.shadowRoot.getElementById('gameId');

    createBtn.onclick = () => {
      const name = nameEl.value.trim();
      if (!name) {
        alert('Bitte gib Deinen Namen ein.');
        return;
      }
      this.dispatchEvent(new CustomEvent('ace-create', {
        detail: { name, wsUrl: this.getAttribute('ws-url') },
        bubbles: true,
        composed: true
      }));
    };

    joinBtn.onclick = () => {
      const name   = nameEl.value.trim();
      const gameId = gameEl.value.trim().toUpperCase();
      if (!name) {
        alert('Bitte gib Deinen Namen ein.');
        return;
      }
      if (!gameId) {
        alert('Bitte gib die Spiel-ID ein.');
        return;
      }
      this.dispatchEvent(new CustomEvent('ace-join', {
        detail: { name, gameId, wsUrl: this.getAttribute('ws-url') },
        bubbles: true,
        composed: true
      }));
    };
  }
}

customElements.define('ace-landing', AceLanding);
