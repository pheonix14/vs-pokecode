// VS POKECODE Webview Frontend Script
(function () {
  // Gracefully acquire VS Code API or mock for standalone browser preview
  const vscode = typeof acquireVsCodeApi !== 'undefined'
    ? acquireVsCodeApi()
    : { postMessage: (msg) => console.log('[Mock VSCode PostMessage]', msg) };

  let currentState = null;

  // Retro 8-bit Web Audio Synthesizer
  class RetroSoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx();
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }

    playTone(freq, type, duration, delay = 0) {
      if (!this.ctx) return;
      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
          gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
          console.warn('Audio play error', e);
        }
      }, delay);
    }

    playEncounter() {
      this.init();
      // Retro battle encounter fanfare
      const notes = [440, 554, 659, 880, 830, 880];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'square', 0.12, idx * 80);
      });
    }

    playCatchSuccess() {
      this.init();
      // Victory jingle
      const notes = [523.25, 523.25, 523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'triangle', 0.16, idx * 110);
      });
    }

    playLevelUp() {
      this.init();
      // Upward arpeggio
      const notes = [330, 392, 493, 587, 659];
      notes.forEach((freq, idx) => {
        this.playTone(freq, 'sine', 0.14, idx * 90);
      });
    }

    playThrow() {
      this.init();
      // Throw swoosh
      this.playTone(350, 'square', 0.08, 0);
      this.playTone(200, 'square', 0.08, 70);
    }

    playFlee() {
      this.init();
      this.playTone(400, 'sawtooth', 0.15, 0);
      this.playTone(250, 'sawtooth', 0.25, 120);
    }
  }

  const sound = new RetroSoundEngine();

  // DOM Elements
  const elTrainerName = document.getElementById('trainer-name');
  const elTrainerLevel = document.getElementById('trainer-level');
  const elStatKeys = document.getElementById('stat-keystrokes');
  const elStatWpm = document.getElementById('stat-wpm');
  const elStatStreak = document.getElementById('stat-streak');
  const elMeterPercent = document.getElementById('meter-percent');
  const elMeterFill = document.getElementById('meter-bar-fill');

  const elEncounterCard = document.getElementById('encounter-card');
  const elIdleField = document.getElementById('idle-field');
  const elWildSprite = document.getElementById('wild-sprite');
  const elWildName = document.getElementById('wild-name');
  const elWildLevel = document.getElementById('wild-level');
  const elWildRarity = document.getElementById('wild-rarity');
  const elWildTypes = document.getElementById('wild-types');
  const elWildSparkles = document.getElementById('wild-sparkles');
  const elCatchChanceVal = document.getElementById('catch-chance-val');
  const elEncounterLog = document.getElementById('encounter-log');

  const elCountPokeball = document.getElementById('count-pokeball');
  const elCountGreatball = document.getElementById('count-greatball');
  const elCountUltraball = document.getElementById('count-ultraball');
  const elCountRazzberry = document.getElementById('count-razzberry');

  const elIdleBuddySprite = document.getElementById('idle-buddy-sprite');
  const elIdleBuddyName = document.getElementById('idle-buddy-name');
  const elIdleBuddyLevel = document.getElementById('idle-buddy-level');
  const elBuddyXpText = document.getElementById('buddy-xp-text');
  const elBuddyXpBar = document.getElementById('buddy-xp-bar');

  const elPartyList = document.getElementById('party-list');
  const elPokedexGrid = document.getElementById('pokedex-grid');
  const elDexCount = document.getElementById('dex-count');
  const elInventoryGrid = document.getElementById('inventory-grid');
  const elToast = document.getElementById('toast');

  // Tab Switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const tabId = `tab-${btn.dataset.tab}`;
      const tabContent = document.getElementById(tabId);
      if (tabContent) tabContent.classList.add('active');
    });
  });

  // Action Button Listeners
  document.querySelectorAll('.ball-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      sound.playThrow();
      vscode.postMessage({
        type: 'THROW_BALL',
        payload: { ballId: btn.dataset.ball }
      });
    });
  });

  const btnRazz = document.getElementById('btn-razz');
  if (btnRazz) {
    btnRazz.addEventListener('click', () => {
      vscode.postMessage({
        type: 'FEED_BERRY',
        payload: { berryId: 'razzberry' }
      });
    });
  }

  const btnFlee = document.getElementById('btn-flee');
  if (btnFlee) {
    btnFlee.addEventListener('click', () => {
      sound.playFlee();
      vscode.postMessage({ type: 'FLEE' });
    });
  }

  const btnSpawnTest = document.getElementById('btn-spawn-test');
  if (btnSpawnTest) {
    btnSpawnTest.addEventListener('click', () => {
      vscode.postMessage({ type: 'DEBUG_SPAWN' });
    });
  }

  // Toast Helper
  function showToast(message, duration = 3000) {
    if (!elToast) return;
    elToast.textContent = message;
    elToast.classList.remove('hidden');
    setTimeout(() => {
      elToast.classList.add('hidden');
    }, duration);
  }

  // Handle incoming messages from VS Code extension
  window.addEventListener('message', event => {
    const message = event.data;
    switch (message.type) {
      case 'INIT_STATE':
      case 'STATE_UPDATE':
        updateUI(message.payload);
        break;
      case 'ENCOUNTER_SPAWN':
        sound.playEncounter();
        showToast(`A wild ${message.payload.species.name} appeared!`);
        break;
      case 'CATCH_SUCCESS':
        sound.playCatchSuccess();
        showToast(`Gotcha! ${message.payload.nickname} was caught!`, 4000);
        break;
      case 'LEVEL_UP':
        sound.playLevelUp();
        showToast(`${message.payload.nickname} grew to Level ${message.payload.level}!`, 4000);
        break;
    }
  });

  function updateUI(state) {
    if (!state) return;
    currentState = state;

    const { trainer, typingStats, activeEncounter, buddy, inventoryItems } = state;

    // 1. Trainer HUD
    if (trainer) {
      elTrainerName.textContent = trainer.name;
      elTrainerLevel.textContent = trainer.level;
    }

    if (typingStats) {
      elStatKeys.textContent = typingStats.keystrokes;
      elStatWpm.textContent = typingStats.wpm;
      elStatStreak.textContent = typingStats.currentStreak;

      const meterPct = Math.min(100, Math.round(typingStats.encounterMeter));
      elMeterPercent.textContent = `${meterPct}%`;
      elMeterFill.style.width = `${meterPct}%`;
    }

    // 2. Active Wild Encounter or Idle Field
    if (activeEncounter && activeEncounter.status === 'ACTIVE') {
      elEncounterCard.classList.remove('hidden');
      elIdleField.classList.add('hidden');

      elWildName.textContent = activeEncounter.pokemon.nickname;
      elWildLevel.textContent = activeEncounter.pokemon.level;
      elWildSprite.src = activeEncounter.pokemon.spriteUrl;
      elWildRarity.textContent = activeEncounter.species.rarity;
      elWildRarity.className = `rarity-badge ${activeEncounter.species.rarity.toLowerCase()}`;

      // Shiny indicator
      if (activeEncounter.pokemon.isShiny) {
        elWildSparkles.classList.remove('hidden');
      } else {
        elWildSparkles.classList.add('hidden');
      }

      // Types
      elWildTypes.innerHTML = '';
      activeEncounter.species.types.forEach(type => {
        const span = document.createElement('span');
        span.className = 'type-pill';
        span.textContent = type;
        elWildTypes.appendChild(span);
      });

      // Catch rate & logs
      elCatchChanceVal.textContent = `${activeEncounter.species.baseCatchRate}%`;
      if (activeEncounter.logs && activeEncounter.logs.length > 0) {
        elEncounterLog.textContent = activeEncounter.logs[activeEncounter.logs.length - 1];
      }
    } else {
      elEncounterCard.classList.add('hidden');
      elIdleField.classList.remove('hidden');
    }

    // 3. Inventory counts on battle buttons
    if (trainer && trainer.inventory) {
      elCountPokeball.textContent = trainer.inventory['pokeball'] || 0;
      elCountGreatball.textContent = trainer.inventory['greatball'] || 0;
      elCountUltraball.textContent = trainer.inventory['ultraball'] || 0;
      elCountRazzberry.textContent = trainer.inventory['razzberry'] || 0;

      // Disable buttons if zero items
      document.getElementById('btn-pokeball').disabled = (trainer.inventory['pokeball'] || 0) <= 0;
      document.getElementById('btn-greatball').disabled = (trainer.inventory['greatball'] || 0) <= 0;
      document.getElementById('btn-ultraball').disabled = (trainer.inventory['ultraball'] || 0) <= 0;
      document.getElementById('btn-razz').disabled = (trainer.inventory['razzberry'] || 0) <= 0;
    }

    // 4. Buddy Showcase (Field + Detail tab)
    if (buddy) {
      elIdleBuddySprite.src = buddy.spriteUrl;
      elIdleBuddyName.textContent = buddy.nickname;
      elIdleBuddyLevel.textContent = `Lv. ${buddy.level}`;

      elBuddyXpText.textContent = `${buddy.currentXp} / ${buddy.xpToNextLevel}`;
      const xpPct = Math.min(100, Math.round((buddy.currentXp / buddy.xpToNextLevel) * 100));
      elBuddyXpBar.style.width = `${xpPct}%`;

      // Detail tab
      const detailSprite = document.getElementById('detail-buddy-sprite');
      if (detailSprite) detailSprite.src = buddy.spriteUrl;
      const detailName = document.getElementById('detail-buddy-name');
      if (detailName) detailName.textContent = `${buddy.nickname} (Lv. ${buddy.level})`;

      const detailHp = document.getElementById('detail-hp');
      if (detailHp) detailHp.textContent = `${buddy.stats.hp} / ${buddy.stats.maxHp}`;
      const detailAtk = document.getElementById('detail-attack');
      if (detailAtk) detailAtk.textContent = buddy.stats.attack;
      const detailDef = document.getElementById('detail-defense');
      if (detailDef) detailDef.textContent = buddy.stats.defense;
      const detailSpd = document.getElementById('detail-speed');
      if (detailSpd) detailSpd.textContent = buddy.stats.speed;

      const detailTypes = document.getElementById('detail-buddy-types');
      if (detailTypes) {
        detailTypes.innerHTML = '';
        buddy.types.forEach(t => {
          const span = document.createElement('span');
          span.className = 'type-pill';
          span.textContent = t;
          detailTypes.appendChild(span);
        });
      }
    }

    // 5. Inventory Grid in Buddy tab
    if (inventoryItems && elInventoryGrid) {
      elInventoryGrid.innerHTML = '';
      inventoryItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inventory-item-card';
        div.innerHTML = `<span>${item.icon}</span> <span>${item.name}</span> <b style="margin-left: auto;">x${item.count}</b>`;
        elInventoryGrid.appendChild(div);
      });
    }

    // 6. Party List
    if (trainer && trainer.party && elPartyList) {
      elPartyList.innerHTML = '';
      trainer.party.forEach(pkmn => {
        const isBuddy = pkmn.instanceId === trainer.activeBuddyId;
        const card = document.createElement('div');
        card.className = `pokemon-party-card ${isBuddy ? 'is-buddy' : ''}`;
        card.innerHTML = `
          <img class="party-sprite" src="${pkmn.spriteUrl}" alt="${pkmn.name}">
          <div class="party-meta">
            <div class="party-name-row">
              <span>${pkmn.nickname}${pkmn.isShiny ? ' [Shiny]' : ''}</span>
              <span style="color: var(--accent);">Lv. ${pkmn.level}</span>
            </div>
            <div class="party-sub-row">
              <span>${pkmn.types.join('/')}</span>
              <span>-</span>
              <span>HP ${pkmn.stats.hp}/${pkmn.stats.maxHp}</span>
              ${isBuddy ? '<span style="color: #f59e0b; margin-left: auto; font-weight: bold;">[BUDDY]</span>' : ''}
            </div>
          </div>
        `;
        card.addEventListener('click', () => {
          vscode.postMessage({
            type: 'SET_BUDDY',
            payload: { instanceId: pkmn.instanceId }
          });
          showToast(`Set ${pkmn.nickname} as active companion!`);
        });
        elPartyList.appendChild(card);
      });
    }

    // 7. Pokédex Grid
    if (trainer && trainer.pokedex && elPokedexGrid) {
      elPokedexGrid.innerHTML = '';
      const dexEntries = Object.values(trainer.pokedex);
      const caughtCount = dexEntries.filter(e => e.caught).length;
      elDexCount.textContent = `${caughtCount} Caught / ${dexEntries.length} Seen`;

      dexEntries.forEach(entry => {
        const cell = document.createElement('div');
        cell.className = `pokedex-cell ${entry.caught ? '' : 'undiscovered'}`;
        const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${entry.speciesId}.png`;
        cell.innerHTML = `
          <img class="pokedex-cell-sprite" src="${spriteUrl}" alt="#${entry.speciesId}">
          <span>#${entry.speciesId}</span>
          <span>${entry.caught ? (entry.shinyCaught ? '[Caught Shiny]' : '[Caught]') : (entry.seen ? '[Seen]' : '???')}</span>
        `;
        elPokedexGrid.appendChild(cell);
      });
    }
  }

  // Request initial state on load
  vscode.postMessage({ type: 'REQUEST_STATE' });
})();
