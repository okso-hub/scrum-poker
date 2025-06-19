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
    this.addEventListener('ace-create', e => this._onCreate(e.detail));
    this.addEventListener('ace-join',   e => this._onJoin(e.detail));
  }

  _renderLanding() {
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.createElement('ace-landing'));
  }

  async _onCreate({ name }) {
    console.log("Creating room with name:", name);
    const res = await fetch('/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || 'Fehler beim Erstellen');
    }
    const { roomId } = await res.json();

    this._name   = name;
    this._roomId = roomId;
    this._role   = 'admin';

    this._connectWS();


    // TODO: hier _renderLobby() aufrufen
    console.log(`Admin für Raum ${roomId}`);
  }

  async _onJoin({ name, gameId }) {
    console.log("Joining room with name:", name, "and gameId:", gameId);
    const res = await fetch('/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, roomId: gameId })
    });
    if (!res.ok) {
      const err = await res.json();
      return alert(err.error || 'Fehler beim Beitreten');
    }

    this._name   = name;
    this._roomId = gameId;
    this._role   = 'player';

    this._connectWS();
    // TODO: hier _renderPlayerLobby() aufrufen
    console.log(`Player ${name} beigetreten Raum ${gameId}`);
  }

  _connectWS() {
    const url = this.getAttribute('ws-url') + '/ws';
    this._ws = new WebSocket(url);

    this._ws.onopen = () => {
      this._ws.send(JSON.stringify({
        roomId: this._roomId,
        role:   this._role,
        payload: { name: this._name }
      }));
    };

    this._ws.onmessage = event => {
      const { from, payload } = JSON.parse(event.data);
      console.log(`WS ← ${from}:`, payload);
      // TODO: dispatchen in die entsprechenden Child-Components
    };

    this._ws.onclose = () => {
      console.log('WebSocket geschlossen');
    };
    this._ws.onerror = e => {
      console.error('WS-Fehler', e);
    };
  }
}

customElements.define('agile-ace', AgileAce);
