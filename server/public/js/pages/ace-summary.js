import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    /* Loads global styling & page-specific styling */
    const [summaryStyles, summaryTemplate] = await Promise.all([
      loadStylesheet('/css/summary.css'),
      loadTemplate('/html/ace-summary.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(summaryStyles);
    this._template = summaryTemplate;
    
    this._summary = JSON.parse(this.getAttribute('summary') || '{}');
    this._render();
  }

  _render() {
    const { items = [], totalAverage = 0, totalTasks = 0 } = this._summary;
    // calculate sum of all averages
    const sumOfAverages = items.reduce((acc, item) => acc + Number(item.average), 0);

    const html = interpolateTemplate(this._template, {
      totalTasks,
      totalAverage,
      sumOfAverages
    });
    
    this.shadowRoot.innerHTML = html;

    // Load items shown in summary dynamically
    const summaryList = this.shadowRoot.getElementById('summary-list');
    const itemsHtml = items.map(itemData => `
      <li class="list-item">
        <span>${itemData.item}</span>
        <span>${itemData.average}</span>
      </li>
    `).join('');
    summaryList.innerHTML += itemsHtml;

    // Handler for button used to return to landing page
    const backButton = this.shadowRoot.getElementById('back-button');
    backButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('ace-back-to-landing', {
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define('ace-summary', AceSummary);
