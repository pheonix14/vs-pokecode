# VS POKECODE

> **A real-time Pokemon companion extension for VS Code and Terminal.**  
> Spawn, battle, catch, level up, and evolve Pokemon simply by typing your code!

---

## How It Works

1. **Type Code in Any File**: As you type code in VS Code or run terminal commands, keystrokes charge your **Wild Encounter Meter** and earn EXP for your active **Buddy Pokemon**.
2. **Terminal Plugin**: Running commands in your terminal tracks words. Every 8 words typed triggers a wild Pokemon encounter directly in your console.
3. **Coding Streaks & Multipliers**: Keep typing without pausing to build combos (up to 4.0x multiplier). Higher streaks boost encounter rarity and shiny odds (up to 6%).
4. **Passive Item Drops**: Hitting coding milestones automatically rewards you with Poke Balls, Great Balls, Ultra Balls, and Razz Berries.
5. **Wild Encounters**: When your meter reaches 100% or 8 words in terminal, a wild Pokemon spawns with pixel sprites.
6. **Level Up & Evolution**: Your Pokemon gains EXP directly from your typing. Reach target levels (e.g. Charmander Lv. 16, Ivysaur Lv. 32) to witness dynamic evolutions.
7. **Pokedex & Party Management**: Keep up to 6 Pokemon in your active battle party, assign any Pokemon as your companion, and complete your Pokedex.

---

## Project Architecture & File Structure

VS POKECODE is built in **TypeScript** using a clean, domain-driven modular architecture:

```
vs-pokecode/
├── .vscode/                   # VS Code launch & debugging configurations
├── package.json               # Extension manifest, commands & settings
├── tsconfig.json              # Strict TypeScript configuration
├── LICENSE                    # Open-source MIT License
├── media/                     # Graphics, audio & frontend assets
│   ├── icons/                 # Pokeball activity bar vector icon
│   ├── styles.css             # Retro GameBoy / Pixel HUD stylesheet
│   ├── main.js                # Webview client & 8-bit Web Audio synthesizer
│   └── preview.html           # Standalone browser playground
├── bin/
│   └── pokecode.js            # Global CLI executable
├── src/
│   ├── extension.ts           # VS Code extension lifecycle entry point
│   ├── types.ts               # Core domain models & TypeScript interfaces
│   ├── core/                  # Pure game logic
│   │   ├── game-engine.ts     # Master engine orchestrating events
│   │   ├── typing-engine.ts   # Keystrokes, WPM, streak & combo multipliers
│   │   ├── spawn-engine.ts    # Procedural spawns, rarity & shiny algorithm
│   │   └── evolution-engine.ts# Level progression & species evolution
│   ├── data/
│   │   ├── pokemon-db.ts      # Multi-generation Pokemon catalog & sprites
│   │   └── items.ts           # Pokeballs, Berries & Item effects
│   ├── storage/               # Specialized File System & Persistence
│   │   ├── file-system.ts     # Atomic JSON writes & SHA-256 rolling backups
│   │   └── save-manager.ts    # Debounced auto-save & migration engine
│   ├── terminal/              # Terminal Shell Plugin & CLI
│   │   ├── cli.ts             # Terminal CLI entry point
│   │   ├── word-tracker.ts    # 8-word spawn engine & notification dispatcher
│   │   ├── sprites.ts         # Colored ANSI pixel sprites
│   │   └── plugin-installer.ts# Shell hook installer for ~/.bashrc
│   └── ui/
│       ├── status-bar.ts      # Interactive status bar companion & alert
│       └── webview-provider.ts# Activity Bar sidebar WebviewViewProvider
└── tests/
    └── test-runner.ts         # Automated unit & integration verification suite
```

---

## Specialized File System (.pokecode)

Player progress is managed by `PokeFileSystem` located at `~/.pokecode/`:
* `trainer.json` - Trainer profile, level, inventory, and party instances.
* `settings.json` - Audio toggles, auto-throw preferences, and themes.
* `terminal_session.json` - Word counter and spawn session state.
* `backups/` - Rolling atomic backups with SHA-256 integrity checksums.
* `sessions/` - Daily coding and catch logs (`session_YYYY-MM-DD.jsonl`).

---

## Quick Start & Installation

### Option 1: Terminal Shell Plugin (Spawns Every 8 Words)
Enable the terminal plugin:
```bash
pokecode on
source ~/.bashrc
```

Commands:
* `pokecode watch`: Interactive typing console (spawns every 8 words)
* `pokecode stats`: View trainer level, words typed, and companion stats
* `pokecode dex`: View Pokedex discoveries
* `pokecode spawn`: Manually summon a wild Pokemon
* `pokecode off`: Disable shell plugin

### Option 2: VS Code Extension
Install the packaged extension:
```bash
npm run build
npm run package
code --install-extension vs-pokecode-0.1.0.vsix
```

### Option 3: Browser Live Preview
To test the visual HUD:
```bash
npm run dev:preview
```
Open `http://localhost:3000` in your web browser.

---

## VS Code Commands

Press `Ctrl+Shift+P` (or `Cmd+Shift+P`) and search for `VS POKECODE`:

| Command | Description |
| :--- | :--- |
| `VS POKECODE: Open Companion & Pokedex Panel` | Focuses the Pokemon sidebar companion view |
| `VS POKECODE: Summon Wild Pokemon (Encounter)` | Triggers a wild Pokemon encounter |
| `VS POKECODE: Throw Poke Ball` | Quick-catch active wild encounter |
| `VS POKECODE: View Trainer & Typing Stats` | Displays your total keystrokes, WPM, and level |
| `VS POKECODE: Select Active Companion Buddy` | Switch your active companion Pokemon |
| `VS POKECODE: Export Trainer Save Data` | Backup your trainer profile to a JSON file |
| `VS POKECODE: Reset Trainer Journey` | Reset your data and restart with a fresh starter |
