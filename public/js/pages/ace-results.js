import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Results-Styles laden */
    const resultsStyles = await loadStylesheet('/css/results.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(resultsStyles);
    
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
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._roomId = this.getAttribute('room-id') || '';
    this._isLastItem = this.getAttribute('is-last-item') === 'true';
    this._render();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <ace-navbar room-id="${this._roomId}" is-admin="${this._isAdmin}"></ace-navbar>
      <div class="question-box">
        <h1 class="question">${this._question}</h1>
      </div>
      <div class="average-box">Average: ${this._average}</div>
      ${this._isAdmin ? `
        <div class="actions">
          ${this._isLastItem
            ? '<button id="summaryBtn" class="primary">Show Summary</button>'
            : '<button id="nextBtn" class="primary">Next Item</button>'}
          <button id="repeatBtn" class="secondary">Repeat Voting</button>
        </div>
      ` : ''}
    `;
    if (this._isAdmin) {
      this.shadowRoot.getElementById('nextBtn')?.addEventListener('click', () => this._nextItem());
      this.shadowRoot.getElementById('summaryBtn')?.addEventListener('click', () => this._showSummary());
      this.shadowRoot.getElementById('repeatBtn')?.addEventListener('click', () => this._repeatVoting());
    }
  }

  async _nextItem() {
    try {
      await fetch(`/room/${this._roomId}/next`, { method: 'POST' });
    } catch (error) {
      console.error('Error starting next item:', error);
    }
  }

  async _repeatVoting() {
    try {
      await fetch(`/room/${this._roomId}/repeat`, { method: 'POST' });
    } catch (error) {
      console.error('Error repeating voting:', error);
    }
  }

  async _showSummary() {
    try {
      await fetch(`/room/${this._roomId}/summary`, { method: 'POST' });
    } catch (error) {
      console.error('Error showing summary:', error);
    }
  }
}

customElements.define('ace-results', AceResults);
