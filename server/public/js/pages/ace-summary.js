import "../components/ace-navbar.js";
import { combineStylesheets, loadStylesheet } from '../utils/styles.js';
import { loadTemplate, interpolateTemplate } from '../utils/templates.js';

class AceSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  async connectedCallback() {
    const [summaryStyles, summaryTemplate] = await Promise.all([
      loadStylesheet('/css/summary.css'),
      loadTemplate('/html/ace-summary.html')
    ]);
    
    this.shadowRoot.adoptedStyleSheets = await combineStylesheets(summaryStyles);
    this._template = summaryTemplate;
    
    this._summary = JSON.parse(this.getAttribute('summary') || '{}');
    this._backendUrl = this.getAttribute('backend-url');
    this._hideNavbar = this.getAttribute('hide-navbar') === 'true';
    
    this._render();
    this._setupEventListeners();
  }

  _render() {
    const { items = [], totalAverage = 0, totalTasks = 0 } = this._summary;
    const sumOfAverages = items.reduce((acc, item) => acc + Number(item.average), 0);
    
    const html = interpolateTemplate(this._template, {
      backendUrl: this._backendUrl,
      totalTasks,
      totalAverage,
      sumOfAverages
    });
    
    this.shadowRoot.innerHTML = html;
    
    // Remove navbar if hide-navbar is true
    if (this._hideNavbar) {
      const navbar = this.shadowRoot.querySelector('ace-navbar');
      if (navbar) {
        navbar.remove();
      }
    }
    
    this._renderSummaryContent();
  }

  _renderSummaryContent() {
    const { items = [] } = this._summary;

    // Load items shown in summary dynamically (only the list items, not the totals)
    const summaryList = this.shadowRoot.getElementById('summary-list');
    if (summaryList) {
      const itemsHtml = items.map(itemData => `
        <li class="list-item">
          <span>${itemData.item}</span>
          <span>${itemData.average}</span>
        </li>
      `).join('');
      
      // Preserve the header and add items after it
      summaryList.innerHTML = `
        <li class="header"><span>Item</span><span>Average Points</span></li>
        ${itemsHtml}
      `;
    }
  }

  _setupEventListeners() {
    // Event Handler for the button
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
