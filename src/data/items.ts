import { InventoryItem } from '../types';

export const ITEMS_DATABASE: Record<string, InventoryItem> = {
  pokeball: {
    id: 'pokeball',
    name: 'Poké Ball',
    category: 'BALL',
    catchBonus: 1.0,
    description: 'A standard device for catching wild Pokémon. Earned every 25 keystrokes.',
    count: 10,
    icon: '🔴'
  },
  greatball: {
    id: 'greatball',
    name: 'Great Ball',
    category: 'BALL',
    catchBonus: 1.5,
    description: 'A good, high-performance Ball that provides a higher catch rate than a standard Poké Ball.',
    count: 3,
    icon: '🔵'
  },
  ultraball: {
    id: 'ultraball',
    name: 'Ultra Ball',
    category: 'BALL',
    catchBonus: 2.0,
    description: 'An ultra-high-performance Ball with a higher catch rate than a Great Ball.',
    count: 1,
    icon: '🟡'
  },
  masterball: {
    id: 'masterball',
    name: 'Master Ball',
    category: 'BALL',
    catchBonus: 999.0, // Guaranteed catch
    description: 'The best Ball with the ultimate performance. It catches any wild Pokémon without fail.',
    count: 0,
    icon: '🟣'
  },
  razzberry: {
    id: 'razzberry',
    name: 'Razz Berry',
    category: 'BERRY',
    catchBonus: 1.25,
    description: 'Feed this to a wild Pokémon to make it calmer and easier to catch on your next throw.',
    count: 5,
    icon: '🍓'
  },
  goldenrazz: {
    id: 'goldenrazz',
    name: 'Golden Razz Berry',
    category: 'BERRY',
    catchBonus: 2.5,
    description: 'A miraculous berry that drastically calms wild Pokémon and boosts catch chances.',
    count: 1,
    icon: '✨'
  }
};
