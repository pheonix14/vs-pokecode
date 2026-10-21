import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PokeFileSystem } from '../src/storage/file-system';
import { SaveManager } from '../src/storage/save-manager';
import { TypingEngine } from '../src/core/typing-engine';
import { SpawnEngine } from '../src/core/spawn-engine';
import { EvolutionEngine } from '../src/core/evolution-engine';
import { GameEngine } from '../src/core/game-engine';
import { POKEMON_BY_ID } from '../src/data/pokemon-db';

console.log('Starting VS POKECODE Verification Suite...\n');

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    testsPassed++;
  } catch (err: any) {
    console.error(`  [FAIL] ${name}`);
    console.error(`     Error: ${err.message}`);
    testsFailed++;
  }
}

// Setup temporary test directory
const testDir = path.join(os.tmpdir(), `pokecode_test_${Date.now()}`);

try {
  // Test 1: PokeFileSystem & Storage
  runTest('PokeFileSystem initializes directories and writes atomic JSON', () => {
    const pfs = new PokeFileSystem(testDir);
    const sampleData = { test: 'charmander', level: 10 };
    pfs.atomicWriteJson('test-file.json', sampleData);

    const loaded = pfs.readJson<typeof sampleData>('test-file.json');
    assert.deepStrictEqual(loaded, sampleData);

    // Test backup creation
    const backupPath = pfs.createBackup('test-file.json');
    assert.ok(backupPath && fs.existsSync(backupPath), 'Backup file was created');
  });

  // Test 2: Typing Engine Keystrokes & Multiplier
  runTest('TypingEngine accumulates keystrokes and computes multiplier', () => {
    let encounterTriggered = false;
    let xpAwarded = 0;

    const te = new TypingEngine({
      onEncounterReady: () => { encounterTriggered = true; },
      onBuddyXpGain: (amt) => { xpAwarded += amt; },
      onItemEarned: () => {},
      onStatsUpdate: () => {}
    });

    te.setEncounterThreshold(20);

    for (let i = 0; i < 25; i++) {
      te.recordKeystrokes(5, 0);
    }

    const stats = te.getStats();
    assert.strictEqual(stats.keystrokes, 25);
    assert.ok(stats.currentStreak >= 25);
    assert.ok(stats.multiplier >= 1.25);
    assert.ok(encounterTriggered, 'Encounter triggered after exceeding threshold');
    assert.ok(xpAwarded > 0, 'Buddy XP was gained');
    te.dispose();
  });

  // Test 3: Spawn Engine
  runTest('SpawnEngine generates valid wild encounter with stats', () => {
    const sm = new SaveManager(testDir);
    const trainer = sm.createNewTrainer();
    const se = new SpawnEngine();

    const encounter = se.generateEncounter(trainer, 40);
    assert.ok(encounter.pokemon.speciesId > 0);
    assert.ok(encounter.pokemon.stats.hp > 0);
    assert.strictEqual(encounter.status, 'ACTIVE');

    // Attempt catch with Master Ball (guaranteed)
    const catchResult = se.attemptCatch(encounter, 999.0);
    assert.strictEqual(catchResult.success, true);
  });

  // Test 4: Evolution Engine
  runTest('EvolutionEngine levels up and evolves Pokémon when threshold met', () => {
    const ee = new EvolutionEngine();
    const charmander = POKEMON_BY_ID.get(4)!;

    const instance = {
      instanceId: 'test_char',
      speciesId: 4,
      name: charmander.name,
      nickname: charmander.name,
      level: 15,
      currentXp: 0,
      xpToNextLevel: 50,
      isShiny: false,
      caughtAt: Date.now(),
      types: charmander.types,
      spriteUrl: charmander.spriteUrl,
      stats: { ...charmander.baseStats, maxHp: charmander.baseStats.hp }
    };

    // Add XP to push level 15 -> 16 (Evolution to Charmeleon #5)
    const result = ee.addXp(instance, 100);
    assert.strictEqual(result.leveledUp, true);
    assert.strictEqual(result.evolved, true);
    assert.strictEqual(instance.speciesId, 5, 'Evolved into Charmeleon (ID 5)');
    assert.strictEqual(instance.name, 'Charmeleon');
  });

  // Test 5: Full GameEngine Integration
  runTest('GameEngine handles full typing -> encounter -> catch lifecycle', () => {
    let notified = false;
    const engine = new GameEngine({
      onStateUpdate: () => {},
      onEncounterSpawned: () => {},
      onCatchSuccess: () => {},
      onLevelUp: () => {},
      onItemDrop: () => {},
      onNotification: () => { notified = true; }
    }, testDir);

    const initialKeys = engine.getTrainer().totalKeystrokes;

    // Simulate typing burst
    for (let i = 0; i < 60; i++) {
      engine.onTextTyped(5, 0);
    }

    assert.ok(engine.getTrainer().totalKeystrokes > initialKeys);

    // Force encounter & throw ball
    engine.forceSpawn();
    const encounter = engine.getActiveEncounter();
    assert.ok(encounter !== null, 'Encounter active');

    // Give trainer masterball to guarantee catch
    engine.getTrainer().inventory['masterball'] = 1;
    const catchRes = engine.throwBall('masterball');
    assert.strictEqual(catchRes.success, true);

    const pokedex = engine.getTrainer().pokedex;
    assert.ok(pokedex[encounter.pokemon.speciesId].caught, 'Registered as caught in Pokedex');

    engine.dispose();
  });

} finally {
  // Clean up test dir
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
  } catch (_) {}
}

console.log(`\n========================================`);
console.log(`Test Results: ${testsPassed} Passed, ${testsFailed} Failed.`);
console.log(`========================================\n`);

if (testsFailed > 0) {
  process.exit(1);
}
