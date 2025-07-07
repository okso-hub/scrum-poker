import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Results-Styles laden */
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
    this._roomId = this.getAttribute('room-id') || '';
    this._isLastItem = this.getAttribute('is-last-item') === 'true';
    this._backendUrl = this.getAttribute("backend-url");
    this._render();
  }

  _render() {
    const html = interpolateTemplate(this._template, {
      roomId: this._roomId,
      isAdmin: this._isAdmin,
      question: this._question,
      average: this._average
    });
    
    this.shadowRoot.innerHTML = html;

    this._populateVoteTable();
    this._setupButtons();
  }

  _populateVoteTable() {
    const voteTableBody = this.shadowRoot.getElementById('vote-table-body');
    const voteOverviewSection = this.shadowRoot.getElementById('vote-overview-section');
    
    const voteEntries = Object.entries(this._votes);
    
    if (voteEntries.length === 0) {
      voteOverviewSection.style.display = 'none';
      return;
    }
    
    voteTableBody.innerHTML = voteEntries
      .map(([playerName, vote]) => {
        // Find player in allPlayers array to get isAdmin status
        const player = this._allPlayers.find(p => p.name === playerName);
        const isAdmin = player ? player.isAdmin : false;
        
        console.log(`Player: ${playerName}, isAdmin: ${isAdmin}`, player);
        
        return `
          <tr class="${isAdmin ? 'admin-user' : 'regular-user'}">
            <td class="player-name">${playerName}</td>
            <td class="vote-value">${vote}</td>
          </tr>
        `;
      })
      .join('');
  }

  _setupButtons() {
    const adminActions = this.shadowRoot.getElementById('admin-actions');
    const nextBtn = this.shadowRoot.getElementById('next-button');
    const summaryBtn = this.shadowRoot.getElementById('summary-button');
    const repeatBtn = this.shadowRoot.getElementById('repeat-button');

    if (!this._isAdmin) {
      adminActions.style.display = 'none';
      return;
    }

    // Show appropriate primary button based on whether it's the last item
    if (this._isLastItem) {
      nextBtn.style.display = 'none';
      summaryBtn.style.display = 'inline-block';
    } else {
      nextBtn.style.display = 'inline-block';
      summaryBtn.style.display = 'none';
    }

    // Set up event listeners
    nextBtn.addEventListener('click', () => this._nextItem());
    summaryBtn.addEventListener('click', () => this._showSummary());
    repeatBtn.addEventListener('click', () => this._repeatVoting());
  }

  async _nextItem() {
    try {
      await fetch(this._backendUrl + `/room/${this._roomId}/next`, { method: 'POST' });
    } catch (error) {
      console.error('Error starting next item:', error);
    }
  }

  async _repeatVoting() {
    try {
      await fetch(this._backendUrl + `/room/${this._roomId}/repeat`, { method: 'POST' });
    } catch (error) {
      console.error('Error repeating voting:', error);
    }
  }

  async _showSummary() {
    try {
      await fetch(this._backendUrl + `/room/${this._roomId}/summary`, { method: 'POST' });
    } catch (error) {
      console.error('Error showing summary:', error);
    }
  }
}

customElements.define('ace-results', AceResults);
