// public/js/components/ace-question.js
const questionStyles = new CSSStyleSheet();
questionStyles.replaceSync(`
:host { display:block; font-family:sans-serif; text-align:center; padding:1rem; }
.item {
  font-size:3rem;
  transition: font-size 0.5s ease;
  margin-bottom:1rem;
}
.item.shrink { font-size:1.5rem; }
.options {
  display:flex; justify-content:center; gap:0.5rem;
  opacity:0; transition:opacity 0.5s ease;
}
.options.visible { opacity:1; }
button.option {
  padding:0.5rem 1rem;
  font-size:1rem;
  cursor:pointer;
}
`);

class AceQuestion extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode:'open' });
    this.shadowRoot.adoptedStyleSheets = [questionStyles];
  }

  connectedCallback() {
    this._item    = this.getAttribute('item') || '';
    this._options = JSON.parse(this.getAttribute('options') || '[]');
    this._render();
    // nach 5s Frage verkleinern & Optionen anzeigen
    setTimeout(() => {
      this.shadowRoot.getElementById('itemEl').classList.add('shrink');
      const opts = this.shadowRoot.getElementById('options');
      opts.classList.add('visible');
      // Klick-Handler für Voting-Buttons
      this._options.forEach(opt => {
        const btn = this.shadowRoot.querySelector(`button[data-value="${opt}"]`);
        btn.onclick = () =>
          this.dispatchEvent(new CustomEvent('ace-vote', {
            detail: { value: opt },
            bubbles: true,
            composed: true
          }));
      });
    }, 5000);
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <div class="item" id="itemEl">${this._item}</div>
      <div class="options" id="options">
        ${this._options.map(opt =>
          `<button class="option" data-value="${opt}">${opt}</button>`
        ).join('')}
      </div>
    `;
  }
}

customElements.define('ace-question', AceQuestion);
