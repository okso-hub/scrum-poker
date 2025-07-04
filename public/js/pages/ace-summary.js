import { combineStylesheets, loadStylesheet } from '../utils/styles.js';

class AceSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    /* Globale Styles + spezifische Summary-Styles laden */
    const summaryStyles = await loadStylesheet('/css/summary.css');
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(summaryStyles);
    
    this._summary = JSON.parse(this.getAttribute('summary') || '{}');
    this._render();
  }

  _render() {
    const { items = [], totalAverage = 0, totalTasks = 0 } = this._summary;
    // calculate sum of all averages
    const sumOfAverages = items.reduce((acc, item) => acc + Number(item.average), 0);

    this.shadowRoot.innerHTML = `
      <h2>Sprint Summary</h2>
      <ul id="summaryList" class="summary-list">
        <li class="header"><span>Item</span><span>Average Points</span></li>
        ${items.map(itemData => `
          <li class="list-item">
            <span>${itemData.item}</span>
            <span>${itemData.average}</span>
          </li>
        `).join('')}
      </ul>
      <div class="total">
        ${totalTasks} Items • Average: ${totalAverage} • Total: ${sumOfAverages}
      </div>
      <button class="horizontal" id="backButton">Back to main page</button>
    `;

    // Event Handler for the button
    const backButton = this.shadowRoot.getElementById('backButton');
    backButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ace-back-to-landing', {
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define('ace-summary', AceSummary);
