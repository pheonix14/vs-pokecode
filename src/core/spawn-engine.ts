import { PokemonSpecies, PokemonInstance, ActiveEncounter, RarityTier, TrainerProfile } from '../types';
import { POKEMON_DATABASE, POKEMON_BY_RARITY } from '../data/pokemon-db';

export class SpawnEngine {
  /**
   * Roll a wild Pokémon encounter based on typing streak and trainer level
   */
  public generateEncounter(trainer: TrainerProfile, currentStreak: number): ActiveEncounter {
    const rarity = this.rollRarity(currentStreak);
    const speciesList = POKEMON_BY_RARITY[rarity].length > 0
      ? POKEMON_BY_RARITY[rarity]
      : POKEMON_DATABASE;

    const species = speciesList[Math.floor(Math.random() * speciesList.length)];
    const isShiny = this.rollShiny(currentStreak);

    // Calculate level (Trainer level +/- random variation, minimum 2)
    const levelVariance = Math.floor(Math.random() * 5) - 2;
    const wildLevel = Math.max(2, trainer.level * 2 + levelVariance);

    const wildInstance: PokemonInstance = {
      instanceId: `encounter_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      speciesId: species.id,
      name: species.name,
      nickname: species.name,
      level: wildLevel,
      currentXp: 0,
      xpToNextLevel: wildLevel * 40,
      isShiny,
      caughtAt: Date.now(),
      types: species.types,
      spriteUrl: isShiny ? species.shinySpriteUrl : species.spriteUrl,
      stats: {
        hp: Math.floor(species.baseStats.hp * (1 + wildLevel * 0.1)),
        maxHp: Math.floor(species.baseStats.hp * (1 + wildLevel * 0.1)),
        attack: Math.floor(species.baseStats.attack * (1 + wildLevel * 0.1)),
        defense: Math.floor(species.baseStats.defense * (1 + wildLevel * 0.1)),
        speed: Math.floor(species.baseStats.speed * (1 + wildLevel * 0.1))
      }
    };

    return {
      encounterId: `enc_${Date.now()}`,
      pokemon: wildInstance,
      species,
      status: 'ACTIVE',
      turnsRemaining: 5, // Turns before fleeing
      catchSuccessRate: species.baseCatchRate,
      logs: [`A wild ${species.name}${isShiny ? ' ✨ (SHINY!)' : ''} appeared!`],
      createdAt: Date.now()
    };
  }

  /**
   * Higher typing streaks increase chance of rarer Pokémon
   */
  private rollRarity(streak: number): RarityTier {
    const roll = Math.random() * 100;

    if (streak >= 150) {
      if (roll < 5) return 'MYTHICAL';
      if (roll < 18) return 'LEGENDARY';
      if (roll < 45) return 'EPIC';
      if (roll < 75) return 'RARE';
      return 'UNCOMMON';
    } else if (streak >= 75) {
      if (roll < 3) return 'LEGENDARY';
      if (roll < 15) return 'EPIC';
      if (roll < 40) return 'RARE';
      if (roll < 75) return 'UNCOMMON';
      return 'COMMON';
    } else if (streak >= 25) {
      if (roll < 5) return 'EPIC';
      if (roll < 25) return 'RARE';
      if (roll < 60) return 'UNCOMMON';
      return 'COMMON';
    } else {
      if (roll < 2) return 'EPIC';
      if (roll < 12) return 'RARE';
      if (roll < 40) return 'UNCOMMON';
      return 'COMMON';
    }
  }

  /**
   * Shiny roll: standard 1%, up to 6% with 100+ streak
   */
  private rollShiny(streak: number): boolean {
    const shinyChance = streak >= 100 ? 0.06 : streak >= 50 ? 0.03 : 0.015;
    return Math.random() < shinyChance;
  }

  /**
   * Calculate catch attempt result
   */
  public attemptCatch(
    encounter: ActiveEncounter,
    ballMultiplier: number = 1.0,
    berryMultiplier: number = 1.0
  ): { success: boolean; escaped: boolean; message: string } {
    if (ballMultiplier >= 999) {
      return { success: true, escaped: false, message: 'All-right! Master Ball caught it effortlessly!' };
    }

    // Base catch rate modified by ball, berry, and remaining turns
    const effectiveRate = Math.min(
      95,
      (encounter.species.baseCatchRate * ballMultiplier * berryMultiplier)
    );

    const roll = Math.random() * 100;
    const success = roll <= effectiveRate;

    if (success) {
      return {
        success: true,
        escaped: false,
        message: `Gotcha! ${encounter.species.name} was caught!`
      };
    }

    encounter.turnsRemaining -= 1;
    const escaped = encounter.turnsRemaining <= 0 || (Math.random() < 0.25);

    if (escaped) {
      return {
        success: false,
        escaped: true,
        message: `Oh no! The wild ${encounter.species.name} fled!`
      };
    }

    return {
      success: false,
      escaped: false,
      message: `Aargh! Almost had it! (${encounter.turnsRemaining} chances left)`
    };
  }
}
