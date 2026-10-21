import * as readline from 'readline';
import { WordTracker } from './word-tracker';

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

export function startInteractiveWatcher(): void {
  const tracker = new WordTracker();
  tracker.setEnabled(true);

  console.log(`\n${C.bold}${C.cyan}╔═══════════════════════════════════════════════════════════════╗${C.reset}`);
  console.log(`${C.bold}${C.cyan}║   🎮 VS POKECODE - Interactive Terminal Typing Mode           ║${C.reset}`);
  console.log(`${C.bold}${C.cyan}╚═══════════════════════════════════════════════════════════════╝${C.reset}`);
  console.log(`${C.dim}Type any text or code below. Every 8 words, a wild Pokémon spawns!${C.reset}`);
  console.log(`${C.dim}Press Ctrl+C or type 'exit' to quit.${C.reset}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C.green}pokecode > ${C.reset}`
  });

  rl.prompt();

  rl.on('line', (line: string) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
      rl.close();
      return;
    }

    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter(w => w.length > 0);
      const session = tracker.getSession();
      const currentWords = session.wordsTyped;
      const target = session.targetWords || 8;

      console.log(`${C.dim}Typed ${words.length} words. Progress: [${(currentWords + words.length) % target}/${target} words]${C.reset}`);
      tracker.processInput(line);
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(`\n${C.yellow}Trainer session paused! Your progress is saved.${C.reset}\n`);
    process.exit(0);
  });
}
