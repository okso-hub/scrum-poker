import "../components/ace-navbar.js";
import { createToastHelper } from "../utils/shadow-toast.js";
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
    
    this._results = JSON.parse(this.getAttribute('results') || '{}');
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._gameId = this.getAttribute('game-id');
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
    
    this._renderResults();
    this._renderAdminControls();
  }

  _renderResults() {
    const votes = this._results.votes || {};
    const voteEntries = Object.entries(votes);
    const itemName = this._results.item || 'Unknown Item';
    const average = this._results.average || 0;
    
    console.log("Rendering results with data:", this._results);
    console.log("Vote entries:", voteEntries);
    
    const voteOverview = voteEntries.length > 0 ? `
      <div class="vote-overview">
        <h3>Vote Details</h3>
        <table class="vote-table">
          <thead>
            <tr>
              <th>Player</th>
              <th>Vote</th>
            </tr>
          </thead>
          <tbody>
            ${voteEntries.map(([player, vote]) => `
              <tr>
                <td>${player}</td>
                <td class="vote-value">${vote}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : '';

    // Update only the results content, not the entire shadow DOM
    const questionBox = this.shadowRoot.querySelector('.question-box .question');
    const averageBox = this.shadowRoot.querySelector('.average-box');
    const resultsContainer = this.shadowRoot.querySelector('.results-container') || 
                            this.shadowRoot.querySelector('main') ||
                            this.shadowRoot;
    
    if (questionBox) {
      questionBox.textContent = itemName;
    }
    
    if (averageBox) {
      averageBox.textContent = `Average: ${average}`;
    }
    
    // Add vote overview if there's a results container
    if (resultsContainer && voteOverview) {
      // Remove existing vote overview first
      const existingOverview = resultsContainer.querySelector('.vote-overview');
      if (existingOverview) {
        existingOverview.remove();
      }
      // Add new vote overview
      resultsContainer.insertAdjacentHTML('beforeend', voteOverview);
    }
  }

  _renderAdminControls() {
    if (this._isAdmin) {
      const actionsHtml = `
        <div class="actions">
          ${this._isLastItem
            ? '<button id="summaryBtn" class="primary">Show Summary</button>'
            : '<button id="nextBtn" class="primary">Next Item</button>'}
          <button id="repeatBtn" class="secondary">Repeat Voting</button>
        </div>
      `;
      this.shadowRoot.querySelector('.admin-controls').innerHTML = actionsHtml;
    }
  }

  _setupEventListeners() {
    if (this._isAdmin) {
      this.shadowRoot.getElementById('nextBtn')?.addEventListener('click', () => this._nextItem());
      this.shadowRoot.getElementById('summaryBtn')?.addEventListener('click', () => this._showSummary());
      this.shadowRoot.getElementById('repeatBtn')?.addEventListener('click', () => this._repeatVoting());
    }
  }

  async _nextItem() {
    try {
      // Requests server to move on to next item (will trigger an event that sends all connected clients to the next item)
      const res = await fetch(this._backendUrl + `/room/${this._gameId}/next`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        createToastHelper(this, err.message, "error", 3000);
        return;
      }
    } catch (err) {
      createToastHelper(this, err.message, "error", 3000);
      console.error('Error starting next item:', err);
    }
  }

  async _repeatVoting() {
    try {
      // Requests server to repeat item (will trigger an event that sends all connected clients to the current item again)
      const res = await fetch(this._backendUrl + `/room/${this._gameId}/repeat`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        createToastHelper(this, err.message, "error", 3000);
        return;
      }
    } catch (err) {
      createToastHelper(this, err.message, "error", 3000);
      console.error('Error repeating voting:', err);
    }
  }

  async _showSummary() {
    try {
      // Requests server to move on to the summary page (will trigger an event that sends all connected clients to the summary page)
      const res = await fetch(this._backendUrl + `/room/${this._gameId}/summary`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        createToastHelper(this, err.message, "error", 3000);
        return;
      }
    } catch (err) {
      createToastHelper(this, err.message, "error", 3000);
      console.error('Error showing summary:', err);
    }
  }
}

customElements.define('ace-results', AceResults);
