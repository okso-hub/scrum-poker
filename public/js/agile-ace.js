// public/js/agile-ace.js
import './components/ace-landing.js';
import './components/ace-items.js';
import './components/ace-lobby.js';
import './components/ace-question.js';

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
    this.addEventListener('ace-started', e => this._renderQuestion(e.detail));
    this.addEventListener('ace-vote',    e => this._sendVote(e.detail.value));
  }

  _renderLanding() {
    this.shadowRoot.innerHTML = '';
    this.shadowRoot.append(document.createElement('ace-landing'));
  }

  _renderItems() {
    this.shadowRoot.innerHTML = '';
    const cmp = document.createElement('ace-items');
    cmp.setAttribute('room-id', this._roomId);
    cmp.addEventListener('ace-items-submitted', e => {
      console.log('Items gespeichert:', e.detail.items);
      this._renderLobby();
    });
    this.shadowRoot.append(cmp);
  }

  _renderLobby() {
    this.shadowRoot.innerHTML = '';
    const lobby = document.createElement('ace-lobby');
    lobby.setAttribute('room-id', this._roomId);
    lobby.setAttribute('ws-url', this.getAttribute('ws-url'));
    this.shadowRoot.append(lobby);
  }

  _onStartEvent({ item, options }) {
    console.log('Start-Event erhalten:', item, options);
    this._renderQuestion({ item, options });
  }

  _renderQuestion({ item, options }) {
    // 1) Shadow-DOM leeren
    this.shadowRoot.innerHTML = '';

    // 2) Frage zentriert darstellen
    const container = document.createElement('div');
    container.style.textAlign = 'center';
    container.innerHTML = `
      <h2 id="question">${item}</h2>
      <div id="buttons" style="margin-top:2rem;"></div>
    `;
    this.shadowRoot.append(container);

    // 3) nach 5s die Frage „schrumpfen“
    setTimeout(() => {
      const qEl = this.shadowRoot.getElementById('question');
      qEl.animate([
        { fontSize: '2rem' },
        { fontSize: '1rem' }
      ], { duration: 500 });

      // 4) Buttons unterhalb anzeigen
      const btns = this.shadowRoot.getElementById('buttons');
      options.forEach(opt => {
        const b = document.createElement('button');
        b.textContent = opt;
        b.onclick = () => console.log('Gewählt:', opt);
        btns.append(b);
      });
    }, 5000);
  }

  _sendVote(value) {
    // Hier sendest Du per WebSocket Deinen Vote:
    this._ws.send(JSON.stringify({ type:'vote', value }));
    // und kannst z.B. in eine Warte-Komponente wechseln…
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


    this._renderItems();
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
    this._renderLobby();
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
