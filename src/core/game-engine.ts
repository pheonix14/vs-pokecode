import {
  TrainerProfile,
  GameSettings,
  ActiveEncounter,
  TypingStats,
  PokemonInstance,
  PokedexEntry
} from '../types';
import { SaveManager } from '../storage/save-manager';
import { TypingEngine } from './typing-engine';
import { SpawnEngine } from './spawn-engine';
import { EvolutionEngine, LevelUpResult } from './evolution-engine';
import { ITEMS_DATABASE } from '../data/items';

export interface GameEngineEvents {
  onStateUpdate: (state: any) => void;
  onEncounterSpawned: (encounter: ActiveEncounter) => void;
  onCatchSuccess: (pokemon: PokemonInstance, isNewPokedex: boolean) => void;
  onLevelUp: (pokemon: PokemonInstance, result: LevelUpResult) => void;
  onItemDrop: (itemName: string, count: number) => void;
  onNotification: (msg: string, type: 'info' | 'warning' | 'success') => void;
}

export class GameEngine {
  private saveManager: SaveManager;
  private trainer: TrainerProfile;
  private settings: GameSettings;
  private typingEngine: TypingEngine;
  private spawnEngine: SpawnEngine;
  private evolutionEngine: EvolutionEngine;
  private activeEncounter: ActiveEncounter | null = null;
  private activeBerryMultiplier: number = 1.0;
  private events: GameEngineEvents;

  constructor(events: GameEngineEvents, customSavePath?: string) {
    this.events = events;
    this.saveManager = new SaveManager(customSavePath);
    this.trainer = this.saveManager.loadTrainer();
    this.settings = this.saveManager.loadSettings();
    this.spawnEngine = new SpawnEngine();
    this.evolutionEngine = new EvolutionEngine();

    this.typingEngine = new TypingEngine({
      onEncounterReady: () => this.triggerEncounter(),
      onBuddyXpGain: (amount) => this.grantBuddyXp(amount),
      onItemEarned: (itemId, count) => this.awardItem(itemId, count),
      onStatsUpdate: () => this.broadcastState()
    });
  }

  public getTrainer(): TrainerProfile {
    return this.trainer;
  }

  public getSettings(): GameSettings {
    return this.settings;
  }

  public getTypingStats(): TypingStats {
    return this.typingEngine.getStats();
  }

  public getActiveEncounter(): ActiveEncounter | null {
    return this.activeEncounter;
  }

  public getBuddy(): PokemonInstance | null {
    if (!this.trainer.activeBuddyId) return null;
    return this.trainer.party.find(p => p.instanceId === this.trainer.activeBuddyId) || this.trainer.party[0] || null;
  }

  /**
   * Main entry point when user types code in VS Code
   */
  public onTextTyped(charCount: number, lineChanges: number = 0): void {
    this.trainer.totalKeystrokes += 1;
    this.trainer.totalLinesCoded += Math.max(0, lineChanges);

    this.typingEngine.recordKeystrokes(charCount, lineChanges);
    this.saveManager.scheduleSave(this.trainer, this.settings);
  }

  /**
   * Wild encounter trigger
   */
  public triggerEncounter(): void {
    // Only spawn if no encounter currently active or existing one is finished
    if (this.activeEncounter && this.activeEncounter.status === 'ACTIVE') {
      return;
    }

    const streak = this.typingEngine.getStats().currentStreak;
    this.activeEncounter = this.spawnEngine.generateEncounter(this.trainer, streak);
    this.activeBerryMultiplier = 1.0;

    // Register encounter in Pokedex as seen
    const speciesId = this.activeEncounter.species.id;
    if (!this.trainer.pokedex[speciesId]) {
      this.trainer.pokedex[speciesId] = {
        speciesId,
        seen: true,
        caught: false,
        caughtCount: 0,
        shinyCaught: false
      };
    } else {
      this.trainer.pokedex[speciesId].seen = true;
    }

    this.events.onEncounterSpawned(this.activeEncounter);
    this.broadcastState();

    // Auto-throw if setting enabled and user has standard pokeball
    if (this.settings.autoThrowPokeball && (this.trainer.inventory['pokeball'] || 0) > 0) {
      setTimeout(() => {
        if (this.activeEncounter && this.activeEncounter.status === 'ACTIVE') {
          this.throwBall('pokeball');
        }
      }, 500);
    }
  }

  /**
   * Throw a Pokéball at the wild Pokémon
   */
  public throwBall(ballId: string = 'pokeball'): { success: boolean; message: string } {
    if (!this.activeEncounter || this.activeEncounter.status !== 'ACTIVE') {
      return { success: false, message: 'No wild Pokémon to catch right now!' };
    }

    const currentCount = this.trainer.inventory[ballId] || 0;
    if (currentCount <= 0) {
      return { success: false, message: `You have no ${ITEMS_DATABASE[ballId]?.name || ballId}s left!` };
    }

    // Deduct ball from inventory
    this.trainer.inventory[ballId] = currentCount - 1;

    const ballItem = ITEMS_DATABASE[ballId];
    const ballMultiplier = ballItem?.catchBonus || 1.0;

    const result = this.spawnEngine.attemptCatch(
      this.activeEncounter,
      ballMultiplier,
      this.activeBerryMultiplier
    );

    // Reset berry effect after throw
    this.activeBerryMultiplier = 1.0;

    if (result.success) {
      this.activeEncounter.status = 'CAUGHT';
      const caughtPokemon = this.activeEncounter.pokemon;

      // Add to party or box
      if (this.trainer.party.length < 6) {
        this.trainer.party.push(caughtPokemon);
      } else {
        this.trainer.box.push(caughtPokemon);
      }

      // Update Pokédex
      const pEntry = this.trainer.pokedex[caughtPokemon.speciesId];
      const isNewEntry = !pEntry.caught;
      pEntry.caught = true;
      pEntry.caughtCount += 1;
      if (caughtPokemon.isShiny) {
        pEntry.shinyCaught = true;
      }
      if (!pEntry.firstCaughtAt) {
        pEntry.firstCaughtAt = Date.now();
      }

      // Award Trainer XP
      this.trainer.totalXp += this.activeEncounter.species.baseXpYield;
      this.checkTrainerLevel();

      this.events.onCatchSuccess(caughtPokemon, isNewEntry);
      this.saveManager.saveNow(this.trainer, this.settings);
    } else if (result.escaped) {
      this.activeEncounter.status = 'FLED';
    }

    this.activeEncounter.logs.push(result.message);
    this.broadcastState();
    return { success: result.success, message: result.message };
  }

  /**
   * Feed a berry to wild Pokémon
   */
  public feedBerry(berryId: string): { success: boolean; message: string } {
    if (!this.activeEncounter || this.activeEncounter.status !== 'ACTIVE') {
      return { success: false, message: 'No active encounter!' };
    }

    const count = this.trainer.inventory[berryId] || 0;
    if (count <= 0) {
      return { success: false, message: 'No berries left!' };
    }

    this.trainer.inventory[berryId] = count - 1;
    const berryItem = ITEMS_DATABASE[berryId];
    this.activeBerryMultiplier = berryItem?.catchBonus || 1.5;

    const msg = `Fed a ${berryItem.name}! Catch chance increased!`;
    this.activeEncounter.logs.push(msg);
    this.broadcastState();
    return { success: true, message: msg };
  }

  /**
   * Flee from encounter
   */
  public flee(): void {
    if (this.activeEncounter) {
      this.activeEncounter.status = 'FLED';
      this.broadcastState();
    }
  }

  /**
   * Change active buddy Pokémon
   */
  public setBuddy(instanceId: string): boolean {
    const found = this.trainer.party.find(p => p.instanceId === instanceId);
    if (found) {
      this.trainer.activeBuddyId = instanceId;
      this.saveManager.saveNow(this.trainer, this.settings);
      this.broadcastState();
      return true;
    }
    return false;
  }

  private grantBuddyXp(amount: number): void {
    const buddy = this.getBuddy();
    if (!buddy) return;

    const result = this.evolutionEngine.addXp(buddy, amount);
    if (result.leveledUp) {
      this.events.onLevelUp(buddy, result);
      this.saveManager.scheduleSave(this.trainer, this.settings);
    }
  }

  private awardItem(itemId: string, count: number): void {
    const current = this.trainer.inventory[itemId] || 0;
    this.trainer.inventory[itemId] = current + count;
    const itemName = ITEMS_DATABASE[itemId]?.name || itemId;
    this.events.onItemDrop(itemName, count);
  }

  private checkTrainerLevel(): void {
    const needed = this.trainer.level * 250;
    if (this.trainer.totalXp >= needed) {
      this.trainer.level += 1;
      this.events.onNotification(`Trainer Level Up! You are now Level ${this.trainer.level}!`, 'success');
      // Reward an Ultra Ball and Golden Razz
      this.awardItem('ultraball', 2);
      this.awardItem('goldenrazz', 1);
    }
  }

  public getFullState(): Record<string, any> {
    return {
      trainer: this.trainer,
      settings: this.settings,
      typingStats: this.typingEngine.getStats(),
      activeEncounter: this.activeEncounter,
      buddy: this.getBuddy(),
      inventoryItems: Object.values(ITEMS_DATABASE).map(item => ({
        ...item,
        count: this.trainer.inventory[item.id] || 0
      }))
    };
  }

  public broadcastState(): void {
    this.events.onStateUpdate(this.getFullState());
  }

  public forceSpawn(): void {
    this.typingEngine.forceEncounter();
  }

  public dispose(): void {
    this.typingEngine.dispose();
    this.saveManager.dispose();
    this.saveManager.saveNow(this.trainer, this.settings);
  }
}
