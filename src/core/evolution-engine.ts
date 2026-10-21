import { PokemonInstance, PokemonSpecies } from '../types';
import { POKEMON_BY_ID } from '../data/pokemon-db';

export interface LevelUpResult {
  leveledUp: boolean;
  oldLevel: number;
  newLevel: number;
  evolved: boolean;
  oldSpecies?: PokemonSpecies;
  newSpecies?: PokemonSpecies;
  statGains: {
    hp: number;
    attack: number;
    defense: number;
    speed: number;
  };
}

export class EvolutionEngine {
  /**
   * Add XP to a Pokémon instance and check for level-up and evolution
   */
  public addXp(pokemon: PokemonInstance, amount: number): LevelUpResult {
    pokemon.currentXp += amount;
    const oldLevel = pokemon.level;
    let leveledUp = false;
    let evolved = false;
    let oldSpecies: PokemonSpecies | undefined;
    let newSpecies: PokemonSpecies | undefined;

    const statGains = { hp: 0, attack: 0, defense: 0, speed: 0 };

    while (pokemon.currentXp >= pokemon.xpToNextLevel) {
      pokemon.currentXp -= pokemon.xpToNextLevel;
      pokemon.level += 1;
      leveledUp = true;

      // Increase next level threshold
      pokemon.xpToNextLevel = Math.floor(pokemon.level * 45 + (pokemon.level ** 1.3));

      // Calculate stat growth
      const currentSpecies = POKEMON_BY_ID.get(pokemon.speciesId);
      if (currentSpecies) {
        const hpGain = Math.max(1, Math.floor(currentSpecies.baseStats.hp * 0.05));
        const atkGain = Math.max(1, Math.floor(currentSpecies.baseStats.attack * 0.05));
        const defGain = Math.max(1, Math.floor(currentSpecies.baseStats.defense * 0.05));
        const spdGain = Math.max(1, Math.floor(currentSpecies.baseStats.speed * 0.05));

        statGains.hp += hpGain;
        statGains.attack += atkGain;
        statGains.defense += defGain;
        statGains.speed += spdGain;

        pokemon.stats.maxHp += hpGain;
        pokemon.stats.hp = pokemon.stats.maxHp;
        pokemon.stats.attack += atkGain;
        pokemon.stats.defense += defGain;
        pokemon.stats.speed += spdGain;

        // Check evolution
        if (currentSpecies.evolution && pokemon.level >= currentSpecies.evolution.targetLevel) {
          const nextSpecies = POKEMON_BY_ID.get(currentSpecies.evolution.evolvesIntoId);
          if (nextSpecies) {
            oldSpecies = currentSpecies;
            newSpecies = nextSpecies;
            this.applyEvolution(pokemon, nextSpecies);
            evolved = true;
          }
        }
      }
    }

    return {
      leveledUp,
      oldLevel,
      newLevel: pokemon.level,
      evolved,
      oldSpecies,
      newSpecies,
      statGains
    };
  }

  private applyEvolution(pokemon: PokemonInstance, newSpecies: PokemonSpecies): void {
    // If nickname matches old species name, update nickname to new species name
    const oldSpecies = POKEMON_BY_ID.get(pokemon.speciesId);
    if (!pokemon.nickname || (oldSpecies && pokemon.nickname === oldSpecies.name)) {
      pokemon.nickname = newSpecies.name;
    }

    pokemon.speciesId = newSpecies.id;
    pokemon.name = newSpecies.name;
    pokemon.types = [...newSpecies.types];
    pokemon.spriteUrl = pokemon.isShiny ? newSpecies.shinySpriteUrl : newSpecies.spriteUrl;

    // Recalculate stats based on higher base stats
    pokemon.stats.maxHp = Math.floor(newSpecies.baseStats.hp * (1 + pokemon.level * 0.05));
    pokemon.stats.hp = pokemon.stats.maxHp;
    pokemon.stats.attack = Math.floor(newSpecies.baseStats.attack * (1 + pokemon.level * 0.05));
    pokemon.stats.defense = Math.floor(newSpecies.baseStats.defense * (1 + pokemon.level * 0.05));
    pokemon.stats.speed = Math.floor(newSpecies.baseStats.speed * (1 + pokemon.level * 0.05));
  }
}
