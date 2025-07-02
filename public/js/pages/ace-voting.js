// public/js/components/ace-voting.js

const votingStyles = new CSSStyleSheet();
votingStyles.replaceSync(`
.voting-page {
  display: flex;
  flex-direction: column;
  min-block-size: 100svh;
  font-family: system-ui, sans-serif;
  padding: 1rem;
  box-sizing: border-box;
  
  & .question-section {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex: 1;
    min-height: 0;
    
    & .question {
      text-align: center;
      font-size: 3rem;
      margin-block-end: 1.5rem;
      transition: all 0.6s ease;
      line-height: 1.2;
      
      &.positioned {
        font-size: 1.5rem;
        margin-block-end: 1rem;
      }
    }
    
    & .voting-buttons {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      opacity: 0;
      transition: opacity 0.4s ease 0.2s;
      
      &.visible {
        opacity: 1;
      }
      
      & button {
        padding: 0.75rem 1rem;
        font-size: 1rem;
        line-height: 1.5;
        cursor: pointer;
        
        &.selected {
          font-weight: 700;
        }
      }
    }
  }
  
  & .bottom-section {
    flex-shrink: 0;
    
    & .admin-controls {
      text-align: center;
      margin-block-end: 0.5rem;
      
      & button {
        padding: 0.5rem 1rem;
        font-size: 1rem;
        line-height: 1.5;
        cursor: pointer;
      }
    }
    
    & .players-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #ddd;
      border-radius: 0.25rem;
      
      & th,
      & td {
        padding: 0.5rem;
        text-align: left;
        border-bottom: 1px solid #eee;
        line-height: 1.5;
      }
      
      & th {
        font-weight: 700;
        background-color: #f9f9f9;
      }
      
      & tr:last-child td {
        border-bottom: none;
      }
    }
  }
}
`);

class AceVoting extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.adoptedStyleSheets = [votingStyles];
    this._pollInterval = null;
    this._revealed = false;
  }

  connectedCallback() {
    this._item = this.getAttribute('item') || '';
    this._options = JSON.parse(this.getAttribute('options') || '[1,2,3,5,8,13,21]');
    this._roomId = this.getAttribute('room-id') || '';
    this._playerName = this.getAttribute('player-name') || '';
    this._isAdmin = this.getAttribute('is-admin') === 'true';
    this._allPlayers = JSON.parse(this.getAttribute('all-players') || '[]');
    this._render();
    this._startVoteStatusPolling();
  }

  disconnectedCallback() {
    this._stopVoteStatusPolling();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <div class="voting-page">
        <ace-navbar room-id="${this._roomId}" is-admin="${this._isAdmin}"></ace-navbar>
        <div class="question-section">
          <h1 class="question">${this._item}</h1>
          <div class="voting-buttons"></div>
        </div>
        <div class="bottom-section">
          <div class="admin-controls"></div>
          <table class="players-table">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody class="players-table-body"></tbody>
          </table>
        </div>
      </div>
    `;

    this._initializeVoteStatus();
    setTimeout(() => this._showButtons(), 2000);
  }

  _showButtons() {
    const questionEl = this.shadowRoot.querySelector('.question');
    const buttonsEl = this.shadowRoot.querySelector('.voting-buttons');
    
    questionEl.classList.add('positioned');

    this._options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.type = 'button';
      btn.setAttribute('aria-label', `Vote ${opt}`);
      btn.onclick = () => this._sendVote(opt);
      buttonsEl.append(btn);
    });

    buttonsEl.classList.add('visible');

    if (this._isAdmin) {
      const adminControlsEl = this.shadowRoot.querySelector('.admin-controls');
      const revealBtn = document.createElement('button');
      revealBtn.textContent = 'Reveal Votes';
      revealBtn.type = 'button';
      revealBtn.setAttribute('aria-label', 'Reveal all votes');
      revealBtn.onclick = () => this._revealVotes();
      adminControlsEl.appendChild(revealBtn);
    }
  }

  async _sendVote(value) {
    try {
      const response = await fetch(`/room/${this._roomId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: value, playerName: this._playerName })
      });

      if (response.ok) {
        this._currentVote = value;
        this._updateButtonSelection(value);
        this._updateStatus(this._playerName, this._revealed ? value : 'Voted');
      } else {
        throw new Error('Failed to send vote');
      }
    } catch (error) {
      console.error('Error sending vote:', error);
      alert('Error sending vote');
    }
  }

  async _revealVotes() {
    try {
      await fetch(`/room/${this._roomId}/reveal`, { method: 'POST' });
      this._revealed = true;
      // Immediately fetch updated vote-status with actual vote values
      const res = await fetch(`/room/${this._roomId}/vote-status`);
      if (res.ok) {
        const data = await res.json();
        this._updateVoteStatus(data);
      }
    } catch (error) {
      console.error('Error revealing votes:', error);
    }
  }

  _updateButtonSelection(selectedValue) {
    const buttons = this.shadowRoot.querySelectorAll('.voting-buttons button');
    buttons.forEach(btn => {
      if (btn.textContent === selectedValue.toString()) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  _startVoteStatusPolling() {
    this._pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/room/${this._roomId}/vote-status`);
        if (response.ok) {
          const data = await response.json();
          this._updateVoteStatus(data);
        }
      } catch (error) {
        console.error('Error polling vote status:', error);
      }
    }, 2000);
  }

  _stopVoteStatusPolling() {
    if (this._pollInterval) clearInterval(this._pollInterval);
  }

  _initializeVoteStatus() {
    const body = this.shadowRoot.querySelector('.players-table-body');
    body.innerHTML = this._allPlayers.map(player => `
      <tr>
        <td>${player}</td>
        <td class="status-${player}">Waiting...</td>
      </tr>
    `).join('');
  }

  _updateStatus(player, text) {
    const el = this.shadowRoot.querySelector(`.status-${player}`);
    if (el) el.textContent = text;
  }

  _updateVoteStatus({ votedPlayers, votes, allPlayers }) {
    if (allPlayers?.length) {
      this._allPlayers = allPlayers;
      this._initializeVoteStatus();
    }

    this._allPlayers.forEach(player => {
      if (this._revealed && votes) {
        this._updateStatus(player, votes[player] ?? '-');
      } else {
        this._updateStatus(player, votedPlayers?.includes(player) ? 'Voted' : 'Waiting...');
      }
    });
  }
}

customElements.define('ace-voting', AceVoting);
