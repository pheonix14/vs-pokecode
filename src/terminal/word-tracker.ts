import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { SaveManager } from '../storage/save-manager';
import { SpawnEngine } from '../core/spawn-engine';
import { EvolutionEngine } from '../core/evolution-engine';
import { getSprite } from './sprites';
import { POKEMON_BY_ID } from '../data/pokemon-db';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

export interface TerminalSession {
  wordsTyped: number;
  targetWords: number; // Default 8
  totalWords: number;
  totalSpawns: number;
  lastCommand?: string;
  enabled: boolean;
}

export class WordTracker {
  private sessionFile: string;
  private session: TerminalSession;
  private saveManager: SaveManager;
  private spawnEngine: SpawnEngine;
  private evolutionEngine: EvolutionEngine;

  constructor() {
    const pokeDir = path.join(os.homedir(), '.pokecode');
    if (!fs.existsSync(pokeDir)) {
      fs.mkdirSync(pokeDir, { recursive: true });
    }
    this.sessionFile = path.join(pokeDir, 'terminal_session.json');
    this.saveManager = new SaveManager();
    this.spawnEngine = new SpawnEngine();
    this.evolutionEngine = new EvolutionEngine();
    this.session = this.loadSession();
  }

  private loadSession(): TerminalSession {
    if (fs.existsSync(this.sessionFile)) {
      try {
        const raw = fs.readFileSync(this.sessionFile, 'utf-8');
        return JSON.parse(raw);
      } catch (_) {}
    }
    return {
      wordsTyped: 0,
      targetWords: 8,
      totalWords: 0,
      totalSpawns: 0,
      enabled: true
    };
  }

  private saveSession(): void {
    try {
      fs.writeFileSync(this.sessionFile, JSON.stringify(this.session, null, 2), 'utf-8');
    } catch (_) {}
  }

  public getSession(): TerminalSession {
    return { ...this.session };
  }

  public setEnabled(enabled: boolean): void {
    this.session.enabled = enabled;
    this.saveSession();
  }

  public setTargetWords(count: number): void {
    this.session.targetWords = Math.max(1, count);
    this.saveSession();
  }

  /**
   * Process a command or text string executed in terminal
   */
  public processInput(text: string): boolean {
    if (!this.session.enabled || !text) return false;

    // Filter out internal pokecode commands
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('pokecode') || trimmed.startsWith('_pokecode')) {
      return false;
    }

    // Split words by whitespace
    const words = trimmed.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    if (wordCount === 0) return false;

    this.session.wordsTyped += wordCount;
    this.session.totalWords += wordCount;
    this.session.lastCommand = trimmed;

    let spawned = false;

    // Check if target words (default 8) threshold reached
    if (this.session.wordsTyped >= this.session.targetWords) {
      const spawnsToTrigger = Math.floor(this.session.wordsTyped / this.session.targetWords);
      this.session.wordsTyped = this.session.wordsTyped % this.session.targetWords;
      this.session.totalSpawns += spawnsToTrigger;

      // Trigger wild Pokémon spawn in terminal!
      for (let i = 0; i < Math.min(3, spawnsToTrigger); i++) {
        this.triggerTerminalSpawn();
        spawned = true;
      }
    }

    this.saveSession();
    return spawned;
  }

  /**
   * Spawns wild Pokémon directly into the terminal output
   */
  public triggerTerminalSpawn(): void {
    const trainer = this.saveManager.loadTrainer();
    const streak = Math.min(100, Math.floor(this.session.totalWords / 4));
    const encounter = this.spawnEngine.generateEncounter(trainer, streak);
    const pokemon = encounter.pokemon;
    const species = encounter.species;

    // Auto-throw a Pokéball
    const ballType = (trainer.inventory['pokeball'] || 0) > 0 ? 'pokeball' : 'greatball';
    const hasBall = (trainer.inventory[ballType] || 0) > 0;
    let caught = false;

    if (hasBall) {
      trainer.inventory[ballType] -= 1;
      const catchResult = this.spawnEngine.attemptCatch(encounter, 1.2);
      caught = catchResult.success;
    } else {
      // Free starter ball if out of stock
      trainer.inventory['pokeball'] = 5;
      caught = true;
    }

    // If caught, register to party/box & pokedex
    if (caught) {
      if (trainer.party.length < 6) {
        trainer.party.push(pokemon);
      } else {
        trainer.box.push(pokemon);
      }

      const pEntry = trainer.pokedex[pokemon.speciesId] || {
        speciesId: pokemon.speciesId,
        seen: true,
        caught: false,
        caughtCount: 0,
        shinyCaught: false
      };
      pEntry.seen = true;
      pEntry.caught = true;
      pEntry.caughtCount += 1;
      if (pokemon.isShiny) pEntry.shinyCaught = true;
      trainer.pokedex[pokemon.speciesId] = pEntry;

      // Award XP to active Buddy Pokémon
      const buddy = trainer.party.find(p => p.instanceId === trainer.activeBuddyId) || trainer.party[0];
      let levelUpMsg = '';
      if (buddy) {
        const xpGain = Math.floor(species.baseXpYield * 0.7);
        const lvlRes = this.evolutionEngine.addXp(buddy, xpGain);
        if (lvlRes.evolved && lvlRes.newSpecies) {
          levelUpMsg = `\n  ${C.magenta}${C.bold}🌟 WHAT?! ${buddy.nickname} evolved into ${lvlRes.newSpecies.name}!${C.reset}`;
        } else if (lvlRes.leveledUp) {
          levelUpMsg = `\n  ${C.cyan}${C.bold}✨ ${buddy.nickname} leveled up to Lv. ${buddy.level}!${C.reset}`;
        }
      }

      this.saveManager.saveNow(trainer);
      this.renderSpawnBanner(encounter, caught, levelUpMsg);
      this.sendDesktopNotification(species.name, pokemon.level, pokemon.isShiny);
    } else {
      this.renderSpawnBanner(encounter, false);
      this.sendDesktopNotification(species.name, pokemon.level, pokemon.isShiny, false);
    }
  }

  private renderSpawnBanner(encounter: any, caught: boolean, extraMsg: string = ''): void {
    const { pokemon, species } = encounter;
    const shiny = pokemon.isShiny ? ` ${C.yellow}${C.bold}✨ (SHINY!)${C.reset}` : '';
    const spriteLines = getSprite(species.id);

    console.log('');
    console.log(`${C.yellow}╔══════════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.yellow}║${C.reset}  ${C.bold}⚡ A WILD POKÉMON APPEARED!${C.reset} ${C.dim}(8 Words Typed in Terminal)${C.reset}        ${C.yellow}║${C.reset}`);
    console.log(`${C.yellow}╠══════════════════════════════════════════════════════════════════════════╣${C.reset}`);

    const infoLines = [
      ` ${C.bold}${C.white}${species.name}${C.reset}${shiny}  ${C.cyan}Lv.${pokemon.level}${C.reset}`,
      ` ${C.dim}Type:${C.reset} ${species.types.join('/')}  |  ${C.dim}Rarity:${C.reset} ${species.rarity}`,
      ` ${C.dim}HP:${C.reset}   ${pokemon.stats.hp} / ${pokemon.stats.maxHp}`,
      ` `,
      caught
        ? ` ${C.red}🔴${C.reset} ${C.bold}Threw Poké Ball...${C.reset} ${C.green}${C.bold}⭐ Gotcha! ${species.name} caught!${C.reset}`
        : ` ${C.red}🔴${C.reset} ${C.dim}Threw Poké Ball... Oh no! ${species.name} escaped!${C.reset}`,
      ` ${C.dim}Total Words Typed:${C.reset} ${C.yellow}${this.session.totalWords}${C.reset} | ${C.dim}Spawns:${C.reset} ${C.green}${this.session.totalSpawns}${C.reset}`
    ];

    const maxLines = Math.max(spriteLines.length, infoLines.length);
    for (let i = 0; i < maxLines; i++) {
      const sprite = spriteLines[i] || '                  ';
      const info = infoLines[i] || '';
      console.log(`  ${sprite}   ${info}`);
    }

    if (extraMsg) {
      console.log(extraMsg);
    }

    console.log(`${C.yellow}╚══════════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
  }

  private sendDesktopNotification(pokemonName: string, level: number, isShiny: boolean, caught: boolean = true): void {
    const title = `⚡ VS POKECODE: Wild ${pokemonName}!`;
    const shinyStr = isShiny ? ' ✨ Shiny!' : '';
    const body = caught
      ? `A wild Lv.${level} ${pokemonName}${shinyStr} appeared and was caught in your Poké Ball! 🔴`
      : `A wild Lv.${level} ${pokemonName}${shinyStr} appeared, but fled!`;

    exec(`notify-send -t 3000 "${title}" "${body}" 2>/dev/null`, () => {});
  }
}
