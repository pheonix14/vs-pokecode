import { PokemonSpecies, RarityTier, PokemonType } from '../types';

export const POKEMON_DATABASE: PokemonSpecies[] = [
  // --- BULBASAUR LINE ---
  {
    id: 1,
    name: 'Bulbasaur',
    types: ['Grass', 'Poison'],
    rarity: 'COMMON',
    baseCatchRate: 75,
    baseXpYield: 64,
    evolution: { targetLevel: 16, evolvesIntoId: 2 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/1.gif',
    description: 'A strange seed was planted on its back at birth. The plant sprouts and grows with this Pokémon.',
    baseStats: { hp: 45, attack: 49, defense: 49, speed: 45 }
  },
  {
    id: 2,
    name: 'Ivysaur',
    types: ['Grass', 'Poison'],
    rarity: 'UNCOMMON',
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 32, evolvesIntoId: 3 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/2.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/2.gif',
    description: 'When the bud on its back starts swelling, a sweet aroma wafts to indicate the coming bloom.',
    baseStats: { hp: 60, attack: 62, defense: 63, speed: 60 }
  },
  {
    id: 3,
    name: 'Venusaur',
    types: ['Grass', 'Poison'],
    rarity: 'EPIC',
    baseCatchRate: 20,
    baseXpYield: 236,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/3.gif',
    description: 'The flower on its back catches the rays of the sun. The sunlight is absorbed and turned into energy.',
    baseStats: { hp: 80, attack: 82, defense: 83, speed: 80 }
  },

  // --- CHARMANDER LINE ---
  {
    id: 4,
    name: 'Charmander',
    types: ['Fire'],
    rarity: 'COMMON',
    baseCatchRate: 75,
    baseXpYield: 62,
    evolution: { targetLevel: 16, evolvesIntoId: 5 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/4.gif',
    description: 'The flame on its tail indicates Charmander\'s life force. It burns vigorously if healthy.',
    baseStats: { hp: 39, attack: 52, defense: 43, speed: 65 }
  },
  {
    id: 5,
    name: 'Charmeleon',
    types: ['Fire'],
    rarity: 'UNCOMMON',
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 36, evolvesIntoId: 6 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/5.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/5.gif',
    description: 'When it swings its burning tail, the temperature elevates to unbearable levels.',
    baseStats: { hp: 58, attack: 64, defense: 58, speed: 80 }
  },
  {
    id: 6,
    name: 'Charizard',
    types: ['Fire', 'Flying'],
    rarity: 'EPIC',
    baseCatchRate: 15,
    baseXpYield: 240,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/6.gif',
    description: 'It spits fire that is hot enough to melt boulders. Known to cause forest fires unintentionally.',
    baseStats: { hp: 78, attack: 84, defense: 78, speed: 100 }
  },

  // --- SQUIRTLE LINE ---
  {
    id: 7,
    name: 'Squirtle',
    types: ['Water'],
    rarity: 'COMMON',
    baseCatchRate: 75,
    baseXpYield: 63,
    evolution: { targetLevel: 16, evolvesIntoId: 8 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/7.gif',
    description: 'Shoots water at prey while in the water. Withdraws into its shell when in danger.',
    baseStats: { hp: 44, attack: 48, defense: 65, speed: 43 }
  },
  {
    id: 8,
    name: 'Wartortle',
    types: ['Water'],
    rarity: 'UNCOMMON',
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 36, evolvesIntoId: 9 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/8.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/8.gif',
    description: 'When tapped, this Pokémon will pull in its head, but its tail will still stick out a little bit.',
    baseStats: { hp: 59, attack: 63, defense: 80, speed: 58 }
  },
  {
    id: 9,
    name: 'Blastoise',
    types: ['Water'],
    rarity: 'EPIC',
    baseCatchRate: 15,
    baseXpYield: 239,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/9.gif',
    description: 'A brutal Pokémon with pressurized water jets on its shell used for high-speed tackles.',
    baseStats: { hp: 79, attack: 83, defense: 100, speed: 78 }
  },

  // --- PIKACHU LINE ---
  {
    id: 25,
    name: 'Pikachu',
    types: ['Electric'],
    rarity: 'COMMON',
    baseCatchRate: 70,
    baseXpYield: 112,
    evolution: { targetLevel: 22, evolvesIntoId: 26 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/25.gif',
    description: 'When several of these Pokémon gather, their electricity could build and cause lightning storms.',
    baseStats: { hp: 35, attack: 55, defense: 40, speed: 90 }
  },
  {
    id: 26,
    name: 'Raichu',
    types: ['Electric'],
    rarity: 'RARE',
    baseCatchRate: 35,
    baseXpYield: 218,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/26.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/26.gif',
    description: 'Its long tail serves as a ground to protect itself from its own high voltage electrical power.',
    baseStats: { hp: 60, attack: 90, defense: 55, speed: 110 }
  },

  // --- GENGAR LINE ---
  {
    id: 92,
    name: 'Gastly',
    types: ['Ghost', 'Poison'],
    rarity: 'COMMON',
    baseCatchRate: 75,
    baseXpYield: 62,
    evolution: { targetLevel: 25, evolvesIntoId: 93 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/92.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/92.gif',
    description: 'Almost invisible, this gaseous Pokémon cloaks the target and puts it to sleep without notice.',
    baseStats: { hp: 30, attack: 35, defense: 30, speed: 80 }
  },
  {
    id: 93,
    name: 'Haunter',
    types: ['Ghost', 'Poison'],
    rarity: 'UNCOMMON',
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 40, evolvesIntoId: 94 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/93.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/93.gif',
    description: 'Because of its ability to slip through block walls, it is said to be from another dimension.',
    baseStats: { hp: 45, attack: 50, defense: 45, speed: 95 }
  },
  {
    id: 94,
    name: 'Gengar',
    types: ['Ghost', 'Poison'],
    rarity: 'EPIC',
    baseCatchRate: 15,
    baseXpYield: 225,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/94.gif',
    description: 'Under a full moon, this Pokémon loves to mimic the shadows of people and laugh at their fright.',
    baseStats: { hp: 60, attack: 65, defense: 60, speed: 110 }
  },

  // --- EEVEE LINE ---
  {
    id: 133,
    name: 'Eevee',
    types: ['Normal'],
    rarity: 'UNCOMMON',
    baseCatchRate: 60,
    baseXpYield: 65,
    evolution: { targetLevel: 25, evolvesIntoId: 134 }, // Default evolves to Vaporeon, or random
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/133.gif',
    description: 'Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.',
    baseStats: { hp: 55, attack: 55, defense: 50, speed: 55 }
  },
  {
    id: 134,
    name: 'Vaporeon',
    types: ['Water'],
    rarity: 'RARE',
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/134.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/134.gif',
    description: 'Lives close to water. Its long tail is ridged with a fin which is often mistaken for a mermaid\'s.',
    baseStats: { hp: 130, attack: 65, defense: 60, speed: 65 }
  },
  {
    id: 135,
    name: 'Jolteon',
    types: ['Electric'],
    rarity: 'RARE',
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/135.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/135.gif',
    description: 'It accumulates negative ions in the atmosphere to blast out 10000-volt lightning bolts.',
    baseStats: { hp: 65, attack: 65, defense: 60, speed: 130 }
  },
  {
    id: 136,
    name: 'Flareon',
    types: ['Fire'],
    rarity: 'RARE',
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/136.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/136.gif',
    description: 'When storing thermal energy in its body, its temperature could soar to over 1600 degrees.',
    baseStats: { hp: 65, attack: 130, defense: 60, speed: 65 }
  },
  {
    id: 196,
    name: 'Espeon',
    types: ['Psychic'],
    rarity: 'RARE',
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/196.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/196.gif',
    description: 'By reading air currents, it can predict things such as the weather or its foe\'s next move.',
    baseStats: { hp: 65, attack: 65, defense: 60, speed: 110 }
  },
  {
    id: 197,
    name: 'Umbreon',
    types: ['Dark'],
    rarity: 'RARE',
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/197.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/197.gif',
    description: 'When exposed to the moon\'s aura, the rings on its body glow faintly with a mysterious power.',
    baseStats: { hp: 95, attack: 65, defense: 110, speed: 65 }
  },

  // --- SNORLAX ---
  {
    id: 143,
    name: 'Snorlax',
    types: ['Normal'],
    rarity: 'RARE',
    baseCatchRate: 25,
    baseXpYield: 189,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/143.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/143.gif',
    description: 'Very lazy. Just eats and sleeps. As its enormous bulk builds, it becomes steadily more inert.',
    baseStats: { hp: 160, attack: 110, defense: 65, speed: 30 }
  },

  // --- DRAGONITE LINE ---
  {
    id: 147,
    name: 'Dratini',
    types: ['Dragon'],
    rarity: 'UNCOMMON',
    baseCatchRate: 50,
    baseXpYield: 60,
    evolution: { targetLevel: 30, evolvesIntoId: 148 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/147.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/147.gif',
    description: 'Long thought to be mythical until a small colony was found living underwater.',
    baseStats: { hp: 41, attack: 64, defense: 45, speed: 50 }
  },
  {
    id: 148,
    name: 'Dragonair',
    types: ['Dragon'],
    rarity: 'RARE',
    baseCatchRate: 30,
    baseXpYield: 147,
    evolution: { targetLevel: 55, evolvesIntoId: 149 },
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/148.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/148.gif',
    description: 'A mystical Pokémon that exudes a gentle aura. It has the ability to change the climate.',
    baseStats: { hp: 61, attack: 84, defense: 65, speed: 70 }
  },
  {
    id: 149,
    name: 'Dragonite',
    types: ['Dragon', 'Flying'],
    rarity: 'EPIC',
    baseCatchRate: 10,
    baseXpYield: 270,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/149.gif',
    description: 'An extremely rarely seen marine Pokémon. Its intelligence is said to match that of humans.',
    baseStats: { hp: 91, attack: 134, defense: 95, speed: 80 }
  },

  // --- LUCARIO ---
  {
    id: 448,
    name: 'Lucario',
    types: ['Fighting', 'Steel'],
    rarity: 'RARE',
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/448.gif',
    description: 'It can read the thoughts and movements of others by sensing their auras.',
    baseStats: { hp: 70, attack: 110, defense: 70, speed: 90 }
  },

  // --- GRENINJA ---
  {
    id: 658,
    name: 'Greninja',
    types: ['Water', 'Dark'],
    rarity: 'EPIC',
    baseCatchRate: 15,
    baseXpYield: 239,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/658.gif',
    description: 'It creates throwing stars out of compressed water. When it throws them at high speed, they can split metal.',
    baseStats: { hp: 72, attack: 95, defense: 67, speed: 122 }
  },

  // --- LEGENDARIES ---
  {
    id: 150,
    name: 'Mewtwo',
    types: ['Psychic'],
    rarity: 'LEGENDARY',
    baseCatchRate: 5,
    baseXpYield: 306,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/150.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/150.gif',
    description: 'It was created by a scientist after years of horrific gene splicing and DNA engineering.',
    baseStats: { hp: 106, attack: 110, defense: 90, speed: 130 }
  },
  {
    id: 151,
    name: 'Mew',
    types: ['Psychic'],
    rarity: 'MYTHICAL',
    baseCatchRate: 5,
    baseXpYield: 270,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/151.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/151.gif',
    description: 'So rare that it is still said to be a mirage by many experts. Only a few people have seen it.',
    baseStats: { hp: 100, attack: 100, defense: 100, speed: 100 }
  },
  {
    id: 384,
    name: 'Rayquaza',
    types: ['Dragon', 'Flying'],
    rarity: 'LEGENDARY',
    baseCatchRate: 5,
    baseXpYield: 306,
    spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/384.gif',
    shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/384.gif',
    description: 'It flies endlessly in the ozone layer. It is said it would descend to earth only in extreme peril.',
    baseStats: { hp: 105, attack: 150, defense: 90, speed: 95 }
  }
];

export const POKEMON_BY_ID = new Map<number, PokemonSpecies>(
  POKEMON_DATABASE.map((p) => [p.id, p])
);

export const POKEMON_BY_RARITY = {
  COMMON: POKEMON_DATABASE.filter((p) => p.rarity === 'COMMON'),
  UNCOMMON: POKEMON_DATABASE.filter((p) => p.rarity === 'UNCOMMON'),
  RARE: POKEMON_DATABASE.filter((p) => p.rarity === 'RARE'),
  EPIC: POKEMON_DATABASE.filter((p) => p.rarity === 'EPIC'),
  LEGENDARY: POKEMON_DATABASE.filter((p) => p.rarity === 'LEGENDARY'),
  MYTHICAL: POKEMON_DATABASE.filter((p) => p.rarity === 'MYTHICAL')
};
