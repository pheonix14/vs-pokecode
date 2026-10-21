/**
 * VS POKECODE - Core Type Definitions
 * Specialized Game Domain & State Modeling for VS Code Typing Companion
 */

export type PokemonType =
  | 'Normal'
  | 'Fire'
  | 'Water'
  | 'Grass'
  | 'Electric'
  | 'Ice'
  | 'Fighting'
  | 'Poison'
  | 'Ground'
  | 'Flying'
  | 'Psychic'
  | 'Bug'
  | 'Rock'
  | 'Ghost'
  | 'Dragon'
  | 'Steel'
  | 'Fairy'
  | 'Dark';

export type RarityTier =
  | 'COMMON'
  | 'UNCOMMON'
  | 'RARE'
  | 'EPIC'
  | 'LEGENDARY'
  | 'MYTHICAL';

export interface EvolutionRequirement {
  targetLevel: number;
  evolvesIntoId: number;
  requiredItem?: string;
}

export interface PokemonSpecies {
  id: number;
  name: string;
  types: PokemonType[];
  rarity: RarityTier;
  baseCatchRate: number; // Percentage 0 - 100
  baseXpYield: number;
  evolution?: EvolutionRequirement;
  spriteUrl: string;
  shinySpriteUrl: string;
  crySound?: string;
  description: string;
  baseStats: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

export interface PokemonStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface PokemonInstance {
  instanceId: string;
  speciesId: number;
  name: string;
  nickname: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  isShiny: boolean;
  caughtAt: number;
  caughtInLanguage?: string;
  stats: PokemonStats;
  types: PokemonType[];
  spriteUrl: string;
}

export interface TypingStats {
  keystrokes: number;
  charactersTyped: number;
  wordsTyped: number;
  linesModified: number;
  currentStreak: number;
  maxStreak: number;
  wpm: number;
  multiplier: number;
  encounterMeter: number; // 0 to 100
  lastKeystrokeTime: number;
}

export type EncounterStatus = 'ACTIVE' | 'CAUGHT' | 'FLED' | 'DEFEATED';

export interface ActiveEncounter {
  encounterId: string;
  pokemon: PokemonInstance;
  species: PokemonSpecies;
  status: EncounterStatus;
  turnsRemaining: number;
  catchSuccessRate: number;
  ballUsed?: string;
  berryUsed?: string;
  logs: string[];
  createdAt: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'BALL' | 'BERRY' | 'STONE' | 'SPECIAL';
  catchBonus?: number; // Multiplier or flat bonus
  description: string;
  count: number;
  icon: string;
}

export interface PokedexEntry {
  speciesId: number;
  seen: boolean;
  caught: boolean;
  caughtCount: number;
  firstCaughtAt?: number;
  shinyCaught: boolean;
}

export interface TrainerProfile {
  id: string;
  name: string;
  title: string;
  level: number;
  totalXp: number;
  totalKeystrokes: number;
  totalLinesCoded: number;
  activeBuddyId: string | null;
  party: PokemonInstance[];
  box: PokemonInstance[];
  inventory: Record<string, number>;
  pokedex: Record<number, PokedexEntry>;
  unlockedBadges: string[];
  createdAt: number;
  updatedAt: number;
  version: string;
}

export interface GameSettings {
  soundEnabled: boolean;
  volume: number;
  encounterRateMultiplier: number;
  notificationsEnabled: boolean;
  theme: 'gameboy' | 'modern-dark' | 'retro-neon' | 'cyberpunk';
  autoThrowPokeball: boolean;
  spawnOnSave: boolean;
}

export interface WebviewMessage {
  type:
    | 'INIT_STATE'
    | 'KEYSTROKE_BURST'
    | 'ENCOUNTER_SPAWN'
    | 'THROW_BALL'
    | 'FEED_BERRY'
    | 'FLEE'
    | 'SET_BUDDY'
    | 'LEVEL_UP'
    | 'EVOLVE'
    | 'PLAY_SOUND'
    | 'REQUEST_STATE'
    | 'DEBUG_SPAWN';
  payload?: any;
}
