// public/js/components/ace-voting.js

const votingStyles = new CSSStyleSheet();
votingStyles.replaceSync(`
:host {
  display: block;
  font-family: sans-serif;
  padding: 1rem;
}
h2 {
  text-align: center;
  margin-bottom: 2rem;
  font-size: 2rem;
  transition: font-size 0.5s ease;
}
h2.shrink {
  font-size: 1rem;
  margin-bottom: 1rem;
}
.buttons {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
  opacity: 0;
  transition: opacity 0.5s ease;
}
.buttons.visible {
  opacity: 1;
}
.buttons button {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  cursor: pointer;
}
#voteStatus {
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
#playersTable {
  width: 100%;
  border-collapse: collapse;
  border: 1px solid #ddd;
  border-radius: 0.25rem;
}
#playersTable th,
#playersTable td {
  padding: 0.5rem;
  text-align: left;
  border-bottom: 1px solid #eee;
}
#playersTable th {
  font-weight: bold;
  background-color: #f9f9f9;
}
#playersTable tr:last-child td {
  border-bottom: none;
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
      <ace-navbar room-id="${this._roomId}" is-admin="${this._isAdmin}"></ace-navbar>
      <h2 id="question">${this._item}</h2>
      <div id="buttons" class="buttons"></div>
      <div id="voteStatus">
        <table id="playersTable">
          <thead>
            <tr>
              <th>Player</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="playersTableBody"></tbody>
        </table>
      </div>
      <div id="adminControls" style="text-align: center; margin-top: 1rem;"></div>
    `;

    this._initializeVoteStatus();
    this._showButtons();
  }

  _showButtons() {
    const questionEl = this.shadowRoot.getElementById('question');
    const buttonsEl = this.shadowRoot.getElementById('buttons');
    questionEl.classList.add('shrink');

    this._options.forEach(opt => {
      const btn = document.createElement('button');
      btn.textContent = opt;
      btn.className = 'option';
      btn.onclick = () => this._sendVote(opt);
      buttonsEl.append(btn);
    });

    buttonsEl.classList.add('visible');

    if (this._isAdmin) {
      const adminControlsEl = this.shadowRoot.getElementById('adminControls');
      const revealBtn = document.createElement('button');
      revealBtn.textContent = 'Reveal Votes';
      revealBtn.style.padding = '0.75rem 1.5rem';
      revealBtn.style.fontSize = '1rem';
      revealBtn.style.cursor = 'pointer';
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
    const buttons = this.shadowRoot.querySelectorAll('button.option');
    buttons.forEach(btn => {
      if (btn.textContent === selectedValue.toString()) {
        btn.style.fontWeight = 'bold';
      } else {
        btn.style.fontWeight = '';
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
    const body = this.shadowRoot.getElementById('playersTableBody');
    body.innerHTML = this._allPlayers.map(player => `
      <tr>
        <td>${player}</td>
        <td id="status-${player}">Waiting...</td>
      </tr>
    `).join('');
  }

  _updateStatus(player, text) {
    const el = this.shadowRoot.getElementById(`status-${player}`);
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
