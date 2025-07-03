const resultsStyles = new CSSStyleSheet();
resultsStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
/* Question Box */
.question-box {
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  padding: 1rem;
  margin-bottom: 1rem;
}
.question-box h1.question {
  text-align: center;
  font-size: 2.5rem;
  margin: 0;
}
/* Average Box */
.average-box {
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  padding: 1rem;
  text-align: center;
  font-weight: bold;
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
}
/* Actions */
.actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}
/* NEW BUTTONS */
.actions button {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  cursor: pointer;
  border: none;
  background-color: #007bff;
  color: white;
  border-radius: 0.25rem;
}
.actions button:hover {
  background-color: #0056b3;
}
/* OLD BUTTONS
.actions button {
  flex: 1;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}
*/
`);

class AceResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [resultsStyles];
  }

  connectedCallback() {
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
            ? '<button id="summaryBtn">Show Summary</button>'
            : '<button id="nextBtn">Next Item</button>'}
          <button id="repeatBtn">Repeat Voting</button>
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
