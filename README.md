# ⚡ VS POKECODE

> **A real-time Pokémon companion extension for VS Code.**  
> Spawn, battle, catch, level up, and evolve Pokémon simply by typing your code!

---

## 🎮 How It Works

1. **Type Code in Any File**: As you type code in VS Code, every keystroke charges your **Wild Encounter Meter** and earns EXP for your active **Buddy Pokémon**.
2. **Coding Streaks & Multipliers**: Keep typing without pausing to build combos (up to 4.0x multiplier!). Higher streaks dramatically boost encounter rarity and shiny odds (up to 6%!).
3. **Passive Item Drops**: Hitting coding milestones automatically rewards you with Poké Balls, Great Balls, Ultra Balls, and Razz Berries.
4. **Wild Encounters**: When your meter reaches 100%, an animated wild Pokémon spawns directly in your sidebar! Throw Poké Balls or use Razz Berries to catch it.
5. **Level Up & Evolution**: Your Pokémon gains EXP directly from your typing. Reach target levels (e.g. Charmander Lv. 16, Ivysaur Lv. 32) to witness dynamic evolutions!
6. **Pokédex & Party Management**: Keep up to 6 Pokémon in your active battle party, assign any Pokémon as your companion, and complete your Pokédex!

---

## 🏗️ Project Architecture & File Structure

VS POKECODE is built in **TypeScript** using a clean, domain-driven modular architecture designed to support rich graphics (animated sprites, canvas rendering, WebGL) and specialized file persistence:

```
vs-pokecode/
├── .vscode/                   # VS Code launch & debugging configurations
├── package.json               # Extension manifest, commands & settings
├── tsconfig.json              # Strict TypeScript configuration
├── LICENSE                    # Open-source MIT License
├── media/                     # Graphics, audio & frontend assets
│   ├── icons/                 # Pokeball activity bar vector icon
│   ├── styles.css             # Retro GameBoy / Cyberpunk pixel HUD stylesheet
│   ├── main.js                # Webview client & 8-bit Web Audio synthesizer
│   └── preview.html           # Standalone browser playground
├── scripts/
│   └── dev-preview-server.js  # Instant web preview server
├── src/
│   ├── extension.ts           # VS Code extension lifecycle entry point
│   ├── types.ts               # Core domain models, enums & interfaces
│   ├── core/                  # Pure game logic (decoupled from VS Code)
│   │   ├── game-engine.ts     # Master engine orchestrating events
│   │   ├── typing-engine.ts   # Keystrokes, WPM, streak & combo multipliers
│   │   ├── spawn-engine.ts    # Procedural spawns, rarity & shiny algorithm
│   │   └── evolution-engine.ts# Level progression & species evolution
│   ├── data/
│   │   ├── pokemon-db.ts      # Multi-generation Pokémon catalog & sprites
│   │   └── items.ts           # Pokéballs, Berries & Item effects
│   ├── storage/               # Specialized File System & Persistence
│   │   ├── file-system.ts     # Atomic JSON writes, checksums & rolling backups
│   │   └── save-manager.ts    # Debounced auto-save & migration engine
│   └── ui/
│       ├── status-bar.ts      # Interactive status bar companion & alert
│       └── webview-provider.ts# Activity Bar sidebar WebviewViewProvider
└── tests/
    └── test-runner.ts         # Automated unit & integration verification suite
```

---

## 💾 Specialized File System (`.pokecode`)

Your progress is automatically managed by `PokeFileSystem` located at `~/.pokecode/`:
* `trainer.json` - Trainer profile, level, inventory, and party instances.
* `settings.json` - Sound toggles, auto-throw preferences, and themes.
* `backups/` - Rolling atomic backups with SHA-256 integrity checksums.
* `sessions/` - Daily typing and capture logs (`session_YYYY-MM-DD.jsonl`).

---

## 🚀 Quick Start & Installation

### Option 1: Install Directly into VS Code
Compile and install the packaged `.vsix` extension:
```bash
npm run build
npm run package
code --install-extension vs-pokecode-0.1.0.vsix
```

### Option 2: Run in VS Code Debugger (F5)
1. Open this repository in VS Code (`code .`).
2. Press **F5** (or run `Extension` in Run & Debug menu).
3. A new Extension Development Host window will open with VS POKECODE active!

### Option 3: Browser Live Preview
To test the visual HUD, animations, and sound effects instantly without launching VS Code:
```bash
npm run dev:preview
```
Then open `http://localhost:3000` in your web browser.

---

## ⌨️ Extension Commands

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on macOS) and search for `VS POKECODE`:

| Command | Description |
| :--- | :--- |
| `VS POKECODE: Open Companion & Pokédex Panel` | Focuses the Pokémon sidebar companion view |
| `VS POKECODE: Summon Wild Pokémon (Encounter)` | Instantly triggers a wild Pokémon encounter (Debug/Demo) |
| `VS POKECODE: Throw Poké Ball` | Quick-catch active wild encounter |
| `VS POKECODE: View Trainer & Typing Stats` | Displays your total keystrokes, WPM, and level |
| `VS POKECODE: Select Active Companion Buddy` | Switch your active companion Pokémon |
| `VS POKECODE: Export Trainer Save Data` | Backup your trainer profile to a JSON file |
| `VS POKECODE: Reset Trainer Journey` | Reset your data and restart with a fresh starter |

---

## 🎨 Graphics & Audio Features

* **Animated Pokémon Sprites**: Uses transparent animated pixel GIFs for all Pokémon and their shiny variants.
* **Retro 8-Bit Web Audio**: Built-in Web Audio API synthesizes authentic GameBoy sound effects for encounters, throws, catches, and level-ups with zero external audio dependencies.
* **Theme Support**: Pixel-art GameBoy aesthetic with glowing badges and live XP progress bars.
