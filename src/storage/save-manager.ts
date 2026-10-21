import { PokeFileSystem } from './file-system';
import { TrainerProfile, GameSettings, PokemonInstance, PokedexEntry } from '../types';
import { POKEMON_DATABASE } from '../data/pokemon-db';
import { ITEMS_DATABASE } from '../data/items';

const CURRENT_VERSION = '1.0.0';

export class SaveManager {
  private fs: PokeFileSystem;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(customPath?: string) {
    this.fs = new PokeFileSystem(customPath);
  }

  public getFileSystem(): PokeFileSystem {
    return this.fs;
  }

  /**
   * Load or initialize trainer profile
   */
  public loadTrainer(): TrainerProfile {
    const raw = this.fs.readJson<TrainerProfile>('trainer.json');
    if (raw && raw.version) {
      return this.migrateTrainer(raw);
    }
    return this.createNewTrainer();
  }

  /**
   * Load or initialize game settings
   */
  public loadSettings(): GameSettings {
    const raw = this.fs.readJson<GameSettings>('settings.json');
    if (raw) {
      return raw;
    }
    const defaultSettings: GameSettings = {
      soundEnabled: true,
      volume: 0.7,
      encounterRateMultiplier: 1.0,
      notificationsEnabled: true,
      theme: 'gameboy',
      autoThrowPokeball: false,
      spawnOnSave: true
    };
    this.fs.atomicWriteJson('settings.json', defaultSettings);
    return defaultSettings;
  }

  /**
   * Debounced save to reduce disk writes during active typing sessions
   */
  public scheduleSave(trainer: TrainerProfile, settings?: GameSettings): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow(trainer, settings);
    }, 1500);
  }

  public dispose(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  public saveNow(trainer: TrainerProfile, settings?: GameSettings): void {
    trainer.updatedAt = Date.now();
    this.fs.atomicWriteJson('trainer.json', trainer);
    if (settings) {
      this.fs.atomicWriteJson('settings.json', settings);
    }
    // Periodically make backups (e.g. 5% chance or on level up)
    if (Math.random() < 0.05) {
      this.fs.createBackup('trainer.json');
    }
  }

  /**
   * Create fresh new trainer with starter Pikachu
   */
  public createNewTrainer(): TrainerProfile {
    const starterSpecies = POKEMON_DATABASE.find(p => p.id === 25) || POKEMON_DATABASE[0];
    const starterInstance: PokemonInstance = {
      instanceId: `pkmn_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      speciesId: starterSpecies.id,
      name: starterSpecies.name,
      nickname: starterSpecies.name,
      level: 5,
      currentXp: 0,
      xpToNextLevel: 100,
      isShiny: false,
      caughtAt: Date.now(),
      caughtInLanguage: 'TypeScript',
      types: starterSpecies.types,
      spriteUrl: starterSpecies.spriteUrl,
      stats: {
        hp: starterSpecies.baseStats.hp,
        maxHp: starterSpecies.baseStats.hp,
        attack: starterSpecies.baseStats.attack,
        defense: starterSpecies.baseStats.defense,
        speed: starterSpecies.baseStats.speed
      }
    };

    const initialInventory: Record<string, number> = {};
    for (const [key, item] of Object.entries(ITEMS_DATABASE)) {
      initialInventory[key] = item.count;
    }

    const initialPokedex: Record<number, PokedexEntry> = {
      [starterSpecies.id]: {
        speciesId: starterSpecies.id,
        seen: true,
        caught: true,
        caughtCount: 1,
        firstCaughtAt: Date.now(),
        shinyCaught: false
      }
    };

    const newTrainer: TrainerProfile = {
      id: `trainer_${Date.now()}`,
      name: 'Ash Koder',
      title: 'Novice Code Trainer',
      level: 1,
      totalXp: 0,
      totalKeystrokes: 0,
      totalLinesCoded: 0,
      activeBuddyId: starterInstance.instanceId,
      party: [starterInstance],
      box: [],
      inventory: initialInventory,
      pokedex: initialPokedex,
      unlockedBadges: ['Code Beginner'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: CURRENT_VERSION
    };

    this.fs.atomicWriteJson('trainer.json', newTrainer);
    return newTrainer;
  }

  private migrateTrainer(profile: TrainerProfile): TrainerProfile {
    // Schema migration safety check
    if (!profile.inventory) profile.inventory = {};
    if (!profile.party) profile.party = [];
    if (!profile.box) profile.box = [];
    if (!profile.pokedex) profile.pokedex = {};
    if (!profile.unlockedBadges) profile.unlockedBadges = [];
    profile.version = CURRENT_VERSION;
    return profile;
  }
}
