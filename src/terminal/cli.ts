#!/usr/bin/env node

import { WordTracker } from './word-tracker';
import { PluginInstaller } from './plugin-installer';
import { startInteractiveWatcher } from './interactive-watcher';
import { SaveManager } from '../storage/save-manager';
import { spawn } from 'child_process';
import * as path from 'path';
import * as http from 'http';
import * as fs from 'fs';

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

const BANNER = `
${C.red}${C.bold}██╗   ██╗███████╗    ${C.yellow}██████╗  ██████╗ ██╗  ██╗███████╗ ██████╗ ██████╗ ██████╗███████╗
${C.red}${C.bold}██║   ██║██╔════╝    ${C.yellow}██╔══██╗██╔═══██╗██║ ██╔╝██╔════╝██╔════╝██╔═══██╗██╔══██╗██╔════╝
${C.white}${C.bold}██║   ██║███████╗    ${C.yellow}██████╔╝██║   ██║█████╔╝ █████╗  ██║     ██║   ██║██║  ██║█████╗  
${C.white}${C.bold}╚██╗ ██╔╝╚════██║    ${C.yellow}██╔═══╝ ██║   ██║██╔═██╗ ██╔══╝  ██║     ██║   ██║██║  ██║██╔══╝  
${C.cyan}${C.bold} ╚████╔╝ ███████║    ${C.yellow}██║     ╚██████╔╝██║  ██╗███████╗╚██████╗╚██████╔╝██████╔╝███████╗
${C.cyan}${C.bold}  ╚═══╝  ╚══════╝    ${C.yellow}╚═╝      ╚═════╝ ╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝${C.reset}
                                                                  ${C.dim}v0.1.0${C.reset}
`;

function showHelp() {
  console.log(BANNER);
  console.log(`${C.bold}TERMINAL PLUGIN & COMPANION:${C.reset}`);
  console.log(`  ${C.green}pokecode on${C.reset}             Enable shell plugin in ~/.bashrc (spawns every 8 words!)`);
  console.log(`  ${C.green}pokecode off${C.reset}            Disable shell plugin in ~/.bashrc`);
  console.log(`  ${C.green}pokecode watch${C.reset}          Interactive typing mode (spawns every 8 words in console)`);
  console.log(`  ${C.green}pokecode spawn${C.reset}          Summon a wild Pokémon encounter immediately`);
  console.log(`  ${C.green}pokecode stats${C.reset}          View your live Pokémon trainer card & keystrokes`);
  console.log(`  ${C.green}pokecode dex${C.reset}            Display your Pokédex discoveries & caught Pokémon`);
  console.log(`  ${C.green}pokecode web${C.reset}            Launch the browser visual preview`);
  console.log(`  ${C.green}pokecode code [dir]${C.reset}     Launch VS Code with PokeCode ready\n`);
}

function showStats() {
  console.log(BANNER);
  const sm = new SaveManager();
  const trainer = sm.loadTrainer();
  const tracker = new WordTracker();
  const session = tracker.getSession();
  const buddy = trainer.party.find(p => p.instanceId === trainer.activeBuddyId) || trainer.party[0];

  console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                    TRAINER CARD                               ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.bold}Trainer:${C.reset}     ${trainer.name} (${trainer.title})`);
  console.log(`  ${C.bold}Level:${C.reset}       ${C.yellow}Lv. ${trainer.level}${C.reset} (${trainer.totalXp} Total EXP)`);
  console.log(`  ${C.bold}Words Typed:${C.reset} ${C.green}${session.totalWords} words${C.reset} | ${C.yellow}${session.totalSpawns} Pokémon spawned${C.reset}`);
  console.log(`  ${C.bold}Next Spawn:${C.reset}  ${session.wordsTyped} / ${session.targetWords} words typed`);
  if (buddy) {
    const shiny = buddy.isShiny ? ' [SHINY]' : '';
    console.log(`  ${C.bold}Companion:${C.reset}   ${C.magenta}${buddy.nickname}${shiny}${C.reset} (Lv. ${buddy.level} | ${buddy.types.join('/')})`);
    console.log(`  ${C.bold}Buddy EXP:${C.reset}   ${buddy.currentXp} / ${buddy.xpToNextLevel} to next level`);
  }
  console.log(`  ${C.bold}Poke Bag:${C.reset}    [PB] ${trainer.inventory.pokeball || 0} Poke Balls | [GB] ${trainer.inventory.greatball || 0} Great | [UB] ${trainer.inventory.ultraball || 0} Ultra`);
  console.log(`  ${C.bold}Party:${C.reset}       ${trainer.party.length} / 6 Pokemon (${trainer.box?.length || 0} in PC storage)\n`);
}

function showDex() {
  console.log(BANNER);
  const sm = new SaveManager();
  const trainer = sm.loadTrainer();
  const entries = Object.values(trainer.pokedex);
  const caughtCount = entries.filter(e => e.caught).length;

  console.log(`${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                  POKEDEX ARCHIVE                              ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.bold}Completion:${C.reset} ${C.green}${caughtCount} Caught${C.reset} / ${entries.length} Seen\n`);

  entries.forEach(e => {
    const status = e.caught
      ? `${C.green}${e.shinyCaught ? '[Caught Shiny]' : '[Caught]'}${C.reset}`
      : `${C.yellow}[Seen]${C.reset}`;
    console.log(`  #${String(e.speciesId).padStart(3, '0')} : ${status}`);
  });
  console.log('');
}

// Main CLI router
const args = process.argv.slice(2);
const command = args[0] || 'watch';

const installer = new PluginInstaller();
const tracker = new WordTracker();

switch (command) {
  case 'on':
  case 'enable':
  case 'install':
    installer.installToBashrc();
    tracker.setEnabled(true);
    console.log(`${C.green}${C.bold}VS POKECODE Terminal Plugin Enabled!${C.reset}`);
    console.log(`A wild Pokemon will now spawn directly in your terminal every 8 words typed!`);
    console.log(`${C.dim}Tip: Run 'source ~/.bashrc' or open a new terminal window to activate.${C.reset}\n`);
    break;

  case 'off':
  case 'disable':
  case 'uninstall':
    installer.uninstallFromBashrc();
    tracker.setEnabled(false);
    console.log(`${C.yellow}VS POKECODE Terminal Plugin Disabled.${C.reset}\n`);
    break;

  case 'hook':
    // Internal shell hook called by bash plugin on every command
    const cmdText = args.slice(1).join(' ');
    tracker.processInput(cmdText);
    break;

  case 'spawn':
    tracker.triggerTerminalSpawn();
    break;

  case 'watch':
  case 'live':
    startInteractiveWatcher();
    break;

  case 'stats':
    showStats();
    break;

  case 'dex':
  case 'pokedex':
    showDex();
    break;

  case 'code':
  case 'vs':
    const dir = args[1] || '.';
    console.log(`${C.green}Opening VS Code with VS POKECODE in ${dir}...${C.reset}`);
    spawn('code', [dir], { stdio: 'inherit', detached: true });
    break;

  case 'help':
  case '--help':
  case '-h':
    showHelp();
    break;

  default:
    // If text was passed, process it directly as words
    if (args.length > 0) {
      const fullText = args.join(' ');
      tracker.processInput(fullText);
    } else {
      startInteractiveWatcher();
    }
    break;
}
