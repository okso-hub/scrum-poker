import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const [resultsStyles, resultsTemplate] = await Promise.all([
      loadStylesheet('/css/results.css'),
      loadTemplate('/html/ace-results.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(resultsStyles);
    this._template = resultsTemplate;
    
    const data = JSON.parse(this.getAttribute('results') || '{}');
    const votes = data.votes || {};
    const average = data.average || 0;
    const summary = data.summary || {};
    
    // Determine question/item text:
    // 1) explicit attribute, 2) summary.item, 3) first key in votes
    const voteEntries = Object.entries(votes);
    this._question = this.getAttribute('question')
      || summary.item
      || (voteEntries.length > 0 ? voteEntries[0][0] : '');
    this._average = average;
    this._votes = votes;
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._allPlayers = JSON.parse(this.getAttribute('all-players') || '[]');
    this._playerName = this.getAttribute('player-name') || '';
    this._gameId = this.getAttribute('game-id') || '';
    this._isLastItem = this.getAttribute('is-last-item') === 'true';
    this._backendUrl = this.getAttribute('backend-url');
    this._hideNavbar = this.getAttribute('hide-navbar') === 'true';
    
    this._render();
    this._setupEventListeners();
  }

  _render() {
    const html = interpolateTemplate(this._template, {
      gameId: this._gameId,
      isAdmin: this._isAdmin,
      question: this._question,
      average: this._average,
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
    
    this._populateVoteTable();
    this._renderAdminControls();
  }

  _populateVoteTable() {
    const voteTableBody = this.shadowRoot.querySelector('#vote-table-body');
    const voteOverviewSection = this.shadowRoot.querySelector('#vote-overview-section');
    
    const voteEntries = Object.entries(this._votes);
    
    console.log('DEBUG: _allPlayers:', this._allPlayers);
    console.log('DEBUG: _votes:', this._votes);
    console.log('DEBUG: voteEntries:', voteEntries);
    
    if (voteEntries.length === 0) {
      if (voteOverviewSection) {
        voteOverviewSection.style.display = 'none';
      }
      return;
    }
    
    if (voteTableBody) {
      voteTableBody.innerHTML = voteEntries
        .map(([playerName, vote]) => {
          // Find player in allPlayers array to get isAdmin status
          const player = this._allPlayers.find(p => p.name === playerName);
          let isAdmin = player ? player.isAdmin : false;
          
          // Fallback: If no allPlayers info but current user is admin, highlight current user
          if (!player && this._allPlayers.length === 0 && this._isAdmin && playerName === this._playerName) {
            isAdmin = true;
          }
          
          console.log(`DEBUG: Player: ${playerName}, isAdmin: ${isAdmin}, currentPlayer: ${this._playerName}, isCurrentAdmin: ${this._isAdmin}`, player);
          
          return `
            <tr class="${isAdmin ? 'admin-user' : 'regular-user'}">
              <td class="player-name">${playerName}</td>
              <td class="vote-value">${vote}</td>
            </tr>
          `;
        })
        .join('');
    }
  }

  _renderAdminControls() {
    const adminActions = this.shadowRoot.querySelector('#admin-actions');
    const nextBtn = this.shadowRoot.querySelector('#next-button');
    const summaryBtn = this.shadowRoot.querySelector('#summary-button');
    const repeatBtn = this.shadowRoot.querySelector('#repeat-button');

    if (!this._isAdmin) {
      if (adminActions) {
        adminActions.style.display = 'none';
      }
      return;
    }

    // Show appropriate primary button based on whether it's the last item
    if (this._isLastItem) {
      if (nextBtn) nextBtn.style.display = 'none';
      if (summaryBtn) summaryBtn.style.display = 'inline-block';
    } else {
      if (nextBtn) nextBtn.style.display = 'inline-block';
      if (summaryBtn) summaryBtn.style.display = 'none';
    }
  }

  _setupEventListeners() {
    if (this._isAdmin) {
      this.shadowRoot.getElementById('next-button')?.addEventListener('click', () => this._nextItem());
      this.shadowRoot.getElementById('summary-button')?.addEventListener('click', () => this._showSummary());
      this.shadowRoot.getElementById('repeat-button')?.addEventListener('click', () => this._repeatVoting());
    }
  }

  async _nextItem() {
    try {
      // Requests server to move on to next item (will trigger an event that sends all connected clients to the next item)
      await fetch(this._backendUrl + `/room/${this._gameId}/next`, { method: 'POST' });
    } catch (error) {
      console.error('Error starting next item:', error);
    }
  }

  async _repeatVoting() {
    try {
      // Requests server to repeat item (will trigger an event that sends all connected clients to the current item again)
      await fetch(this._backendUrl + `/room/${this._gameId}/repeat`, { method: 'POST' });
    } catch (error) {
      console.error('Error repeating voting:', error);
    }
  }

  async _showSummary() {
    try {
      // Requests server to move on to the summary page (will trigger an event that sends all connected clients to the summary page)
      await fetch(this._backendUrl + `/room/${this._gameId}/summary`, { method: 'POST' });
    } catch (error) {
      console.error('Error showing summary:', error);
    }
  }
}

customElements.define('ace-results', AceResults);
