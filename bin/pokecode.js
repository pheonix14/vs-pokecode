#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { exec, spawn } = require('child_process');

// ANSI Color Helpers
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

function loadTrainerData() {
  const pokeDir = path.join(os.homedir(), '.pokecode');
  const savePath = path.join(pokeDir, 'trainer.json');
  if (fs.existsSync(savePath)) {
    try {
      return JSON.parse(fs.readFileSync(savePath, 'utf-8'));
    } catch (_) {}
  }

  // Initialize fresh trainer journey if first run
  const defaultTrainer = {
    name: 'Ash Koder',
    title: 'Novice Code Trainer',
    level: 1,
    totalXp: 0,
    totalKeystrokes: 0,
    totalLinesCoded: 0,
    activeBuddyId: 'starter_pika',
    party: [
      {
        instanceId: 'starter_pika',
        speciesId: 25,
        name: 'Pikachu',
        nickname: 'Pikachu',
        level: 5,
        currentXp: 0,
        xpToNextLevel: 100,
        isShiny: false,
        types: ['Electric'],
        spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
        stats: { hp: 35, maxHp: 35, attack: 55, defense: 40, speed: 90 }
      }
    ],
    inventory: { pokeball: 10, greatball: 3, ultraball: 1, razzberry: 5 },
    pokedex: {
      25: { speciesId: 25, seen: true, caught: true, caughtCount: 1, shinyCaught: false }
    }
  };

  try {
    if (!fs.existsSync(pokeDir)) fs.mkdirSync(pokeDir, { recursive: true });
    fs.writeFileSync(savePath, JSON.stringify(defaultTrainer, null, 2), 'utf-8');
    return defaultTrainer;
  } catch (_) {}

  return null;
}

function showHelp() {
  console.log(BANNER);
  console.log(`${C.bold}USAGE:${C.reset}`);
  console.log(`  ${C.green}pokecode${C.reset}                Launch the interactive live companion in your browser`);
  console.log(`  ${C.green}pokecode stats${C.reset}          View your live Pokémon trainer stats & coding keystrokes`);
  console.log(`  ${C.green}pokecode dex${C.reset}            Display your Pokédex discoveries & caught Pokémon`);
  console.log(`  ${C.green}pokecode code [dir]${C.reset}     Launch VS Code with PokeCode ready`);
  console.log(`  ${C.green}pokecode help${C.reset}           Show this help message\n`);
  console.log(`${C.bold}OPTIONS:${C.reset}`);
  console.log(`  ${C.cyan}-p, --port <number>${C.reset}  Specify browser preview port (default: 3000)`);
  console.log(`  ${C.cyan}-c, --code${C.reset}           Launch VS Code simultaneously\n`);
}

function showStats() {
  console.log(BANNER);
  const trainer = loadTrainerData();
  if (!trainer) {
    console.log(`${C.yellow}No trainer profile found yet! Start coding in VS Code to begin your journey.${C.reset}\n`);
    return;
  }

  const buddy = trainer.party.find(p => p.instanceId === trainer.activeBuddyId) || trainer.party[0];

  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                   TRAINER CARD                         ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.bold}Trainer:${C.reset}    ${trainer.name} (${trainer.title || 'Novice Code Trainer'})`);
  console.log(`  ${C.bold}Level:${C.reset}      ${C.yellow}Lv. ${trainer.level}${C.reset} (${trainer.totalXp} Total EXP)`);
  console.log(`  ${C.bold}Typing:${C.reset}     ${C.green}${trainer.totalKeystrokes.toLocaleString()} Keystrokes${C.reset} | ${trainer.totalLinesCoded || 0} Lines Coded`);
  if (buddy) {
    const shiny = buddy.isShiny ? ' ✨ (SHINY!)' : '';
    console.log(`  ${C.bold}Companion:${C.reset}  ${C.magenta}${buddy.nickname}${shiny}${C.reset} (Lv. ${buddy.level} | ${buddy.types.join('/')})`);
    console.log(`  ${C.bold}Buddy EXP:${C.reset}  ${buddy.currentXp} / ${buddy.xpToNextLevel} to next level`);
    console.log(`  ${C.bold}Buddy HP:${C.reset}   ${buddy.stats.hp} / ${buddy.stats.maxHp} HP`);
  }
  console.log(`  ${C.bold}Poké Bag:${C.reset}   🔴 ${trainer.inventory.pokeball || 0} Poké Balls | 🔵 ${trainer.inventory.greatball || 0} Great | 🟡 ${trainer.inventory.ultraball || 0} Ultra | 🍓 ${trainer.inventory.razzberry || 0} Berries`);
  console.log(`  ${C.bold}Team Size:${C.reset}  ${trainer.party.length} / 6 in Party (${trainer.box?.length || 0} in PC Storage)\n`);
}

function showDex() {
  console.log(BANNER);
  const trainer = loadTrainerData();
  if (!trainer || !trainer.pokedex) {
    console.log(`${C.yellow}Pokédex is empty! Start coding in VS Code to discover wild Pokémon.${C.reset}\n`);
    return;
  }

  const entries = Object.values(trainer.pokedex);
  const caughtCount = entries.filter(e => e.caught).length;

  console.log(`${C.bold}${C.cyan}╔════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║                 POKÉDEX ARCHIVE                        ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`  ${C.bold}Completion:${C.reset} ${C.green}${caughtCount} Caught${C.reset} / ${entries.length} Seen\n`);

  entries.forEach(e => {
    const status = e.caught
      ? `${C.green}${e.shinyCaught ? '✨ Caught (Shiny)' : '✔ Caught'}${C.reset}`
      : `${C.yellow}👁 Seen${C.reset}`;
    console.log(`  #${String(e.speciesId).padStart(3, '0')} : ${status}`);
  });
  console.log('');
}

function startWebPreview(port = 3000, openBrowser = true) {
  const ROOT = path.join(__dirname, '..');
  const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '/index.html') {
      reqPath = '/media/preview.html';
    }

    const filePath = path.join(ROOT, reqPath);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`${C.yellow}Port ${port} in use, trying ${port + 1}...${C.reset}`);
      startWebPreview(port + 1, openBrowser);
    } else {
      console.error(`${C.red}Server error:${C.reset}`, err);
    }
  });

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(BANNER);
    console.log(`${C.bold}${C.green}🎮 VS POKECODE Interactive Companion is running!${C.reset}`);
    console.log(`👉 Live URL: ${C.cyan}${C.bold}${url}${C.reset}`);
    console.log(`${C.dim}Press Ctrl+C to stop the companion server.${C.reset}\n`);

    if (openBrowser) {
      exec(`xdg-open "${url}" || open "${url}"`, () => {});
    }
  });
}

// CLI Arg Parsing
const args = process.argv.slice(2);
const command = args[0] || 'play';

switch (command) {
  case 'help':
  case '--help':
  case '-h':
    showHelp();
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
    const targetDir = args[1] || '.';
    console.log(`${C.green}Opening VS Code with VS POKECODE in ${targetDir}...${C.reset}`);
    spawn('code', [targetDir], { stdio: 'inherit', detached: true });
    break;
  case 'web':
  case 'play':
  default:
    const portArgIdx = args.findIndex(a => a === '-p' || a === '--port');
    const port = portArgIdx !== -1 && args[portArgIdx + 1] ? parseInt(args[portArgIdx + 1], 10) : 3000;
    if (args.includes('--code') || args.includes('-c')) {
      spawn('code', ['.'], { stdio: 'inherit', detached: true });
    }
    startWebPreview(port, true);
    break;
}
