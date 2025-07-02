const summaryStyles = new CSSStyleSheet();
summaryStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
h2 {
  text-align: center;
  margin-bottom: 1rem;
}
#summaryList {
  margin-bottom: 1rem;
  padding: 0;
  list-style: none;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
#summaryList li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  border-bottom: 1px solid #eee;
}
#summaryList li:last-child {
  border-bottom: none;
}
.total {
  text-align: center;
  padding: 0.75rem;
  font-weight: bold;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
  margin-bottom: 1rem;
}
.back-button {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
}
`);

class AceSummary extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [summaryStyles];
  }

  connectedCallback() {
    this._summary = JSON.parse(this.getAttribute('summary') || '{}');
    this._render();
  }

  _render() {
    const { items = [], totalAverage = 0, totalTasks = 0 } = this._summary;
    // calculate sum of all averages
    const sumOfAverages = items.reduce((acc, item) => acc + Number(item.average), 0);

    this.shadowRoot.innerHTML = `
      <h2>Sprint Summary</h2>
      <ul id="summaryList">
        ${items.map(itemData => `
          <li>
            <span>${itemData.item}</span>
            <span>${itemData.average}</span>
          </li>
        `).join('')}
      </ul>
      <div class="total">
        ${totalTasks} Items • Average: ${totalAverage} • Total: ${sumOfAverages}
      </div>
      <button class="back-button" id="backButton">Zurück zur Startseite</button>
    `;

    // Event Handler für den Button
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
