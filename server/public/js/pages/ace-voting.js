// public/js/components/ace-voting.js

import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceVoting extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._pollInterval = null;
    this._revealed = false;
    this._hasVoted = false;
    this._votedPlayers = [];
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Voting-Styles laden */
    const [votingStyles, votingTemplate] = await Promise.all([
      loadStylesheet('/css/voting.css'),
      loadTemplate('/html/ace-voting.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(votingStyles);
    this._template = votingTemplate;
    
    this._item = this.getAttribute('item') || '';
    this._options = JSON.parse(this.getAttribute('options') || '[1,2,3,5,8,13,21]');
    this._roomId = this.getAttribute('room-id') || '';
    this._playerName = this.getAttribute('player-name') || '';
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._allPlayers = JSON.parse(this.getAttribute('all-players') || '[]');
    this._backendUrl = this.getAttribute("backend-url");
    this._hideNavbar = this.getAttribute('hide-navbar') === 'true';
    this._render();
    this._setupEventListeners();
  }

  _render() {
    const html = interpolateTemplate(this._template, {
      roomId: this._roomId,
      isAdmin: this._isAdmin,
      item: this._item
    });
    
    this.shadowRoot.innerHTML = html;

    // Remove navbar if hide-navbar is true
    if (this._hideNavbar) {
      const navbar = this.shadowRoot.querySelector('ace-navbar');
      if (navbar) {
        navbar.remove();
      }
    }

    this._initializeVoteStatus();
    setTimeout(() => this._showButtons(), 2000);
  }

  _showButtons() {
    const questionEl = this.shadowRoot.querySelector('.question');
    const buttonsEl = this.shadowRoot.querySelector('.voting-buttons');
    
    questionEl.classList.add('positioned');

    this._options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.type = 'button';
      btn.setAttribute('aria-label', `Vote ${opt}`);
      btn.onclick = () => this._sendVote(opt);
      buttonsEl.append(btn);
    });

    buttonsEl.classList.add('visible');

    if (this._isAdmin) {
      const adminControlsEl = this.shadowRoot.querySelector('.admin-controls');
      const revealBtn = document.createElement('button');
      revealBtn.textContent = 'Reveal Votes';
      revealBtn.type = 'button';
      revealBtn.setAttribute('aria-label', 'Reveal all votes');
      revealBtn.onclick = () => this._revealVotes();
      adminControlsEl.appendChild(revealBtn);
    }
  }

  async _sendVote(value) {
    try {
      const response = await fetch(this._backendUrl + `/room/${this._roomId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: value, playerName: this._playerName })
      });

      if (response.ok) {
        this._currentVote = value;
        this._updateButtonSelection(value);
        //this._updateStatus(this._playerName, this._revealed ? value : 'Voted');
      } else {
        throw new Error('Failed to send vote');
      }
    } catch (error) {
      console.error('Error sending vote:', error);
      alert('Error sending vote');
    }
  }

  async _revealVotes() {
    try {
      const resReveal = await fetch(this._backendUrl + `/room/${this._roomId}/reveal`, { method: 'POST' });
      this._revealed = true;
      if(!resReveal.ok) {
        const jsonRes = await resReveal.json();
        alert(jsonRes.error);
        console.error('Failed to reveal votes:', resReveal);
        return;
      }
      // Immediately fetch updated vote-status with actual vote values
      const res = await fetch(this._backendUrl + `/room/${this._roomId}/vote-status`);
      if (res.ok) {
        const data = await res.json();
        this._updateVoteStatus(data);
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
    }
  }

  _updateButtonSelection(selectedValue) {
    const buttons = this.shadowRoot.querySelectorAll('.voting-buttons button');
    buttons.forEach(btn => {
      if (btn.textContent === selectedValue.toString()) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  _initializeVoteStatus() {
    const body = this.shadowRoot.querySelector('.players-table-body');
    body.innerHTML = this._allPlayers.map(player => `
      <tr class="${player.isAdmin ? 'admin-user' : 'regular-user'}">
        <td class="player-name">
          ${player.name}
        </td>
        <td class="status-${player.name}">Waiting...</td>
      </tr>
    `).join('');
  }

  _updateStatus(playerName, text) {
    const el = this.shadowRoot.querySelector(`.status-${playerName}`);
    if (el) el.textContent = text;
  }

  _updateVoteStatus({ votedPlayers, votes, allPlayers }) {
    if (allPlayers?.length) {
      this._allPlayers = allPlayers;
      this._initializeVoteStatus();
    }

    this._allPlayers.forEach(player => {
      if (this._revealed && votes) {
        this._updateStatus(player.name, votes[player.name] ?? '-');
      } else {
        this._updateStatus(player.name, votedPlayers?.includes(player.name) ? 'Voted' : 'Waiting...');
      }
    });
  }

  _onVoteReceived(votedPlayers) {
    votedPlayers.forEach(playerName => {
      this._updateStatus(playerName, 'Voted');
    });
  }

  _setupEventListeners() {
    // Placeholder for future event listeners
  }
}

customElements.define('ace-voting', AceVoting);
