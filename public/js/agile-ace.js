// public/js/agile-ace.js
import './components/ace-landing.js';

class AgileAce extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._bindEvents();
    this._renderLanding();
  }

  _bindEvents() {
    // fängt die Events von ab
    this.addEventListener('ace-create', e => this._onCreate(e.detail));
    this.addEventListener('ace-join',   e => this._onJoin(e.detail));
  }

  _renderLanding() {
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.createElement('ace-landing'));
  }

  _onCreate({ name, wsUrl }) {
    console.log('Erstelle Spiel für', name, 'über', wsUrl);
    // TODO: Game-ID generieren, WS-Verbindung aufbauen und zu Admin-Lobby wechseln
  }

  _onJoin({ name, gameId, wsUrl }) {
    console.log('Tritt Spiel', gameId, 'bei für', name, 'über', wsUrl);
    // TODO: WS-Verbindung aufbauen, Name & gameId übermitteln und zu Player-Lobby wechseln
  }
}

customElements.define('agile-ace', AgileAce);
