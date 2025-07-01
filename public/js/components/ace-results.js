const resultsStyles = new CSSStyleSheet();
resultsStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
h2 {
  text-align: center;
  margin-bottom: 1rem;
}
#resultsList {
  margin-bottom: 1rem;
  padding: 0;
  list-style: none;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
#resultsList li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}
#resultsList li:last-child {
  border-bottom: none;
}
.average {
  text-align: center;
  padding: 0.75rem;
  font-weight: bold;
  font-size: 1.2rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.actions button {
  flex: 1;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}
`);

class AceResults extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [resultsStyles];
  }

  connectedCallback() {
    this._results = JSON.parse(this.getAttribute('results') || '{}');
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._roomId = this.getAttribute('room-id');
    this._isLastItem = this.getAttribute('is-last-item') === 'true';
    this._render();
  }

  _render() {
    const { votes = {}, summary = {}, average = 0 } = this._results;
    
    this.shadowRoot.innerHTML = `
      <h2> Results</h2>
      <ul id="resultsList">
        ${Object.entries(votes).map(([name, vote]) => `
          <li>
            <span>${name}</span>
            <span>${vote}</span>
          </li>
        `).join('')}
      </ul>
      <div class="average">Average: ${average}</div>
      ${this._isAdmin ? `
        <div class="actions">
          ${this._isLastItem ? 
            '<button id="summaryBtn">Show Summary</button>' : 
            '<button id="nextBtn">Next Item</button>'
          }
          <button id="repeatBtn">Repeat Voting</button>
        </div>
      ` : ''}
    `;

    // Add event listeners for admin buttons
    if (this._isAdmin) {
      const nextBtn = this.shadowRoot.getElementById('nextBtn');
      const summaryBtn = this.shadowRoot.getElementById('summaryBtn');
      const repeatBtn = this.shadowRoot.getElementById('repeatBtn');
      
      if (nextBtn) {
        nextBtn.onclick = () => this._nextItem();
      }
      if (summaryBtn) {
        summaryBtn.onclick = () => this._showSummary();
      }
      if (repeatBtn) {
        repeatBtn.onclick = () => this._repeatVoting();
      }
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