import * as vscode from 'vscode';
import * as path from 'path';
import { GameEngine } from '../core/game-engine';
import { WebviewMessage } from '../types';

export class PokeWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'pokecode.mainView';
  private _view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly gameEngine: GameEngine
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

    // Handle messages sent from Webview to extension
    webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
      switch (message.type) {
        case 'REQUEST_STATE':
          this.postMessage('INIT_STATE', this.gameEngine.getFullState());
          break;
        case 'THROW_BALL':
          const ballId = message.payload?.ballId || 'pokeball';
          const catchResult = this.gameEngine.throwBall(ballId);
          if (!catchResult.success) {
            vscode.window.showInformationMessage(catchResult.message);
          }
          break;
        case 'FEED_BERRY':
          const berryId = message.payload?.berryId || 'razzberry';
          this.gameEngine.feedBerry(berryId);
          break;
        case 'FLEE':
          this.gameEngine.flee();
          break;
        case 'SET_BUDDY':
          if (message.payload?.instanceId) {
            this.gameEngine.setBuddy(message.payload.instanceId);
          }
          break;
        case 'DEBUG_SPAWN':
          this.gameEngine.forceSpawn();
          break;
      }
    });

    // Send initial state once webview is ready
    setTimeout(() => {
      this.postMessage('INIT_STATE', this.gameEngine.getFullState());
    }, 200);
  }

  public postMessage(type: string, payload?: any): void {
    if (this._view) {
      this._view.webview.postMessage({ type, payload });
    }
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'main.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'styles.css')
    );

    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; media-src https: data: blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VS POKECODE</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app">
    <!-- Top Trainer HUD -->
    <header class="trainer-hud">
      <div class="trainer-header-row">
        <div class="trainer-title">
          <span class="trainer-badge">*</span>
          <span id="trainer-name" class="pixel-text">Ash Koder</span>
        </div>
        <div class="trainer-level-tag">Lv. <span id="trainer-level">1</span></div>
      </div>
      <div class="trainer-stats-row">
        <div class="stat-pill"><span class="icon">Keys:</span> <span id="stat-keystrokes">0</span></div>
        <div class="stat-pill"><span class="icon">WPM:</span> <span id="stat-wpm">0</span></div>
        <div class="stat-pill streak-pill"><span class="icon">Streak:</span> <span id="stat-streak">0</span>x</div>
      </div>

      <!-- Encounter Meter Bar -->
      <div class="meter-container">
        <div class="meter-label-row">
          <span>WILD ENCOUNTER METER</span>
          <span id="meter-percent">0%</span>
        </div>
        <div class="meter-bar-track">
          <div id="meter-bar-fill" class="meter-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="hud-tabs">
      <button class="tab-btn active" data-tab="battle">FIELD</button>
      <button class="tab-btn" data-tab="buddy">BUDDY</button>
      <button class="tab-btn" data-tab="party">PARTY</button>
      <button class="tab-btn" data-tab="pokedex">DEX</button>
    </nav>

    <!-- TAB 1: FIELD / BATTLE ENCOUNTER -->
    <main id="tab-battle" class="tab-content active">
      <!-- Active Wild Encounter Arena -->
      <div id="encounter-card" class="arena-card hidden">
        <div class="arena-banner">
          <span class="wild-tag">WILD POKEMON!</span>
          <span id="wild-rarity" class="rarity-badge common">COMMON</span>
        </div>
        <div class="wild-sprite-wrapper">
          <div id="wild-sparkles" class="sparkles hidden">*</div>
          <img id="wild-sprite" class="pokemon-sprite floating" src="" alt="Wild Pokemon" />
          <div class="shadow-disc"></div>
        </div>
        <div class="wild-info-row">
          <h2 id="wild-name" class="pixel-heading">Pikachu</h2>
          <span class="wild-level">Lv. <span id="wild-level">5</span></span>
        </div>
        <div id="wild-types" class="types-row"></div>
        <div class="catch-gauge-wrapper">
          <div class="catch-chance-label">Catch Chance: <span id="catch-chance-val">50%</span></div>
          <div id="encounter-log" class="encounter-log-box">A wild Pokemon appeared!</div>
        </div>

        <!-- Encounter Actions -->
        <div class="action-grid">
          <button id="btn-pokeball" class="action-btn ball-btn" data-ball="pokeball">
            <span class="btn-icon">[PB]</span>
            <span class="btn-label">Poke Ball (<span id="count-pokeball">0</span>)</span>
          </button>
          <button id="btn-greatball" class="action-btn ball-btn" data-ball="greatball">
            <span class="btn-icon">[GB]</span>
            <span class="btn-label">Great Ball (<span id="count-greatball">0</span>)</span>
          </button>
          <button id="btn-ultraball" class="action-btn ball-btn" data-ball="ultraball">
            <span class="btn-icon">[UB]</span>
            <span class="btn-label">Ultra Ball (<span id="count-ultraball">0</span>)</span>
          </button>
          <button id="btn-razz" class="action-btn berry-btn" data-berry="razzberry">
            <span class="btn-icon">[RZ]</span>
            <span class="btn-label">Razz Berry (<span id="count-razzberry">0</span>)</span>
          </button>
          <button id="btn-flee" class="action-btn flee-btn">
            <span class="btn-icon">[X]</span>
            <span class="btn-label">Run Away</span>
          </button>
        </div>
      </div>

      <!-- Peaceful Field Screen (When no encounter active) -->
      <div id="idle-field" class="idle-field">
        <div class="buddy-showcase">
          <div class="buddy-header">
            <span class="label">ACTIVE COMPANION</span>
            <span id="idle-buddy-level" class="level-tag">Lv. 5</span>
          </div>
          <div class="sprite-stage">
            <img id="idle-buddy-sprite" class="buddy-sprite walking" src="" alt="Buddy Pokemon" />
            <div class="shadow-disc"></div>
          </div>
          <div id="idle-buddy-name" class="buddy-name-text">Pikachu</div>
          
          <!-- Buddy XP Bar -->
          <div class="xp-bar-box">
            <div class="xp-label-row">
              <span>EXP TO NEXT LEVEL</span>
              <span id="buddy-xp-text">0 / 100</span>
            </div>
            <div class="xp-track">
              <div id="buddy-xp-bar" class="xp-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <div class="typing-callout">
          <p class="instruction-text">Type code in any editor to earn EXP, find Poke Balls, and discover wild Pokemon!</p>
          <button id="btn-spawn-test" class="secondary-btn">Summon Wild Pokemon (Test)</button>
        </div>
      </div>
    </main>

    <!-- TAB 2: BUDDY DETAILS -->
    <section id="tab-buddy" class="tab-content">
      <div class="card buddy-card-full">
        <div class="buddy-spotlight">
          <img id="detail-buddy-sprite" class="showcase-sprite" src="" alt="Buddy" />
          <h3 id="detail-buddy-name">Pikachu</h3>
          <div id="detail-buddy-types" class="types-row"></div>
        </div>
        <div class="stats-table">
          <div class="stat-row"><span>HP</span><span id="detail-hp">35</span></div>
          <div class="stat-row"><span>Attack</span><span id="detail-attack">55</span></div>
          <div class="stat-row"><span>Defense</span><span id="detail-defense">40</span></div>
          <div class="stat-row"><span>Speed</span><span id="detail-speed">90</span></div>
        </div>
        <div class="inventory-summary">
          <h4>Your PokéBag</h4>
          <div id="inventory-grid" class="inventory-grid"></div>
        </div>
      </div>
    </section>

    <!-- TAB 3: PARTY LIST -->
    <section id="tab-party" class="tab-content">
      <div class="tab-header-text">Your Pokémon Team (Max 6)</div>
      <div id="party-list" class="pokemon-grid"></div>
    </section>

    <!-- TAB 4: POKÉDEX -->
    <section id="tab-pokedex" class="tab-content">
      <div class="dex-header-row">
        <span>POKÉDEX ENTRIES</span>
        <span id="dex-count">0 / 151</span>
      </div>
      <div id="pokedex-grid" class="pokedex-grid"></div>
    </section>

    <!-- Notification Toast -->
    <div id="toast" class="toast hidden"></div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
