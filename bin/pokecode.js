#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/terminal/word-tracker.ts
var fs2 = __toESM(require("fs"));
var path2 = __toESM(require("path"));
var os2 = __toESM(require("os"));
var import_child_process = require("child_process");

// src/storage/file-system.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));
var crypto = __toESM(require("crypto"));
var PokeFileSystem = class {
  baseDir;
  sessionsDir;
  backupsDir;
  constructor(customPath) {
    if (customPath) {
      this.baseDir = customPath;
    } else {
      this.baseDir = path.join(os.homedir(), ".pokecode");
    }
    this.sessionsDir = path.join(this.baseDir, "sessions");
    this.backupsDir = path.join(this.baseDir, "backups");
    this.initializeDirectories();
  }
  getBaseDir() {
    return this.baseDir;
  }
  initializeDirectories() {
    const dirs = [this.baseDir, this.sessionsDir, this.backupsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 493 });
      }
    }
  }
  /**
   * Atomic file writing with temp file swapping to prevent corruption
   */
  atomicWriteJson(filename, data) {
    const targetPath = path.join(this.baseDir, filename);
    const tempPath = `${targetPath}.${Date.now()}.tmp`;
    const jsonStr = JSON.stringify(data, null, 2);
    try {
      fs.writeFileSync(tempPath, jsonStr, "utf-8");
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_) {
        }
      }
      throw new Error(`[PokeFS] Failed to atomic-write ${filename}: ${err}`);
    }
  }
  readJson(filename) {
    const targetPath = path.join(this.baseDir, filename);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(targetPath, "utf-8");
      return JSON.parse(raw);
    } catch (err) {
      console.error(`[PokeFS] Error reading JSON file ${filename}:`, err);
      return null;
    }
  }
  /**
   * Create an automated rotating backup with SHA-256 integrity hash
   */
  createBackup(filename) {
    const sourcePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(sourcePath)) {
      return null;
    }
    try {
      const content = fs.readFileSync(sourcePath, "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").substring(0, 8);
      const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
      const backupFilename = `backup_${path.parse(filename).name}_${timestamp}_${hash}.json`;
      const backupPath = path.join(this.backupsDir, backupFilename);
      fs.writeFileSync(backupPath, content, "utf-8");
      this.pruneOldBackups(10);
      return backupPath;
    } catch (err) {
      console.error(`[PokeFS] Backup creation failed:`, err);
      return null;
    }
  }
  /**
   * Keep only the latest N backups
   */
  pruneOldBackups(maxKeep) {
    try {
      const files = fs.readdirSync(this.backupsDir).map((file) => ({
        file,
        time: fs.statSync(path.join(this.backupsDir, file)).mtimeMs
      })).sort((a, b) => b.time - a.time);
      if (files.length > maxKeep) {
        for (let i = maxKeep; i < files.length; i++) {
          fs.unlinkSync(path.join(this.backupsDir, files[i].file));
        }
      }
    } catch (e) {
    }
  }
  /**
   * Log typing session metrics
   */
  logSession(sessionData) {
    const dateStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const sessionFile = path.join(this.sessionsDir, `session_${dateStr}.jsonl`);
    const line = JSON.stringify({ timestamp: Date.now(), ...sessionData }) + "\n";
    fs.appendFileSync(sessionFile, line, "utf-8");
  }
  /**
   * Export all trainer and game data to an external path
   */
  exportData(targetFilePath, fullData) {
    const exportPayload = {
      exportVersion: "1.0.0",
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      data: fullData
    };
    fs.writeFileSync(targetFilePath, JSON.stringify(exportPayload, null, 2), "utf-8");
  }
  /**
   * Import data from an exported file
   */
  importData(sourceFilePath) {
    const raw = fs.readFileSync(sourceFilePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.data) {
      throw new Error('Invalid export format: missing "data" key.');
    }
    return parsed.data;
  }
};

// src/data/pokemon-db.ts
var POKEMON_DATABASE = [
  // --- BULBASAUR LINE ---
  {
    id: 1,
    name: "Bulbasaur",
    types: ["Grass", "Poison"],
    rarity: "COMMON",
    baseCatchRate: 75,
    baseXpYield: 64,
    evolution: { targetLevel: 16, evolvesIntoId: 2 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/1.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/1.gif",
    description: "A strange seed was planted on its back at birth. The plant sprouts and grows with this Pok\xE9mon.",
    baseStats: { hp: 45, attack: 49, defense: 49, speed: 45 }
  },
  {
    id: 2,
    name: "Ivysaur",
    types: ["Grass", "Poison"],
    rarity: "UNCOMMON",
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 32, evolvesIntoId: 3 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/2.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/2.gif",
    description: "When the bud on its back starts swelling, a sweet aroma wafts to indicate the coming bloom.",
    baseStats: { hp: 60, attack: 62, defense: 63, speed: 60 }
  },
  {
    id: 3,
    name: "Venusaur",
    types: ["Grass", "Poison"],
    rarity: "EPIC",
    baseCatchRate: 20,
    baseXpYield: 236,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/3.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/3.gif",
    description: "The flower on its back catches the rays of the sun. The sunlight is absorbed and turned into energy.",
    baseStats: { hp: 80, attack: 82, defense: 83, speed: 80 }
  },
  // --- CHARMANDER LINE ---
  {
    id: 4,
    name: "Charmander",
    types: ["Fire"],
    rarity: "COMMON",
    baseCatchRate: 75,
    baseXpYield: 62,
    evolution: { targetLevel: 16, evolvesIntoId: 5 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/4.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/4.gif",
    description: "The flame on its tail indicates Charmander's life force. It burns vigorously if healthy.",
    baseStats: { hp: 39, attack: 52, defense: 43, speed: 65 }
  },
  {
    id: 5,
    name: "Charmeleon",
    types: ["Fire"],
    rarity: "UNCOMMON",
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 36, evolvesIntoId: 6 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/5.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/5.gif",
    description: "When it swings its burning tail, the temperature elevates to unbearable levels.",
    baseStats: { hp: 58, attack: 64, defense: 58, speed: 80 }
  },
  {
    id: 6,
    name: "Charizard",
    types: ["Fire", "Flying"],
    rarity: "EPIC",
    baseCatchRate: 15,
    baseXpYield: 240,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/6.gif",
    description: "It spits fire that is hot enough to melt boulders. Known to cause forest fires unintentionally.",
    baseStats: { hp: 78, attack: 84, defense: 78, speed: 100 }
  },
  // --- SQUIRTLE LINE ---
  {
    id: 7,
    name: "Squirtle",
    types: ["Water"],
    rarity: "COMMON",
    baseCatchRate: 75,
    baseXpYield: 63,
    evolution: { targetLevel: 16, evolvesIntoId: 8 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/7.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/7.gif",
    description: "Shoots water at prey while in the water. Withdraws into its shell when in danger.",
    baseStats: { hp: 44, attack: 48, defense: 65, speed: 43 }
  },
  {
    id: 8,
    name: "Wartortle",
    types: ["Water"],
    rarity: "UNCOMMON",
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 36, evolvesIntoId: 9 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/8.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/8.gif",
    description: "When tapped, this Pok\xE9mon will pull in its head, but its tail will still stick out a little bit.",
    baseStats: { hp: 59, attack: 63, defense: 80, speed: 58 }
  },
  {
    id: 9,
    name: "Blastoise",
    types: ["Water"],
    rarity: "EPIC",
    baseCatchRate: 15,
    baseXpYield: 239,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/9.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/9.gif",
    description: "A brutal Pok\xE9mon with pressurized water jets on its shell used for high-speed tackles.",
    baseStats: { hp: 79, attack: 83, defense: 100, speed: 78 }
  },
  // --- PIKACHU LINE ---
  {
    id: 25,
    name: "Pikachu",
    types: ["Electric"],
    rarity: "COMMON",
    baseCatchRate: 70,
    baseXpYield: 112,
    evolution: { targetLevel: 22, evolvesIntoId: 26 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/25.gif",
    description: "When several of these Pok\xE9mon gather, their electricity could build and cause lightning storms.",
    baseStats: { hp: 35, attack: 55, defense: 40, speed: 90 }
  },
  {
    id: 26,
    name: "Raichu",
    types: ["Electric"],
    rarity: "RARE",
    baseCatchRate: 35,
    baseXpYield: 218,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/26.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/26.gif",
    description: "Its long tail serves as a ground to protect itself from its own high voltage electrical power.",
    baseStats: { hp: 60, attack: 90, defense: 55, speed: 110 }
  },
  // --- GENGAR LINE ---
  {
    id: 92,
    name: "Gastly",
    types: ["Ghost", "Poison"],
    rarity: "COMMON",
    baseCatchRate: 75,
    baseXpYield: 62,
    evolution: { targetLevel: 25, evolvesIntoId: 93 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/92.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/92.gif",
    description: "Almost invisible, this gaseous Pok\xE9mon cloaks the target and puts it to sleep without notice.",
    baseStats: { hp: 30, attack: 35, defense: 30, speed: 80 }
  },
  {
    id: 93,
    name: "Haunter",
    types: ["Ghost", "Poison"],
    rarity: "UNCOMMON",
    baseCatchRate: 45,
    baseXpYield: 142,
    evolution: { targetLevel: 40, evolvesIntoId: 94 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/93.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/93.gif",
    description: "Because of its ability to slip through block walls, it is said to be from another dimension.",
    baseStats: { hp: 45, attack: 50, defense: 45, speed: 95 }
  },
  {
    id: 94,
    name: "Gengar",
    types: ["Ghost", "Poison"],
    rarity: "EPIC",
    baseCatchRate: 15,
    baseXpYield: 225,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/94.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/94.gif",
    description: "Under a full moon, this Pok\xE9mon loves to mimic the shadows of people and laugh at their fright.",
    baseStats: { hp: 60, attack: 65, defense: 60, speed: 110 }
  },
  // --- EEVEE LINE ---
  {
    id: 133,
    name: "Eevee",
    types: ["Normal"],
    rarity: "UNCOMMON",
    baseCatchRate: 60,
    baseXpYield: 65,
    evolution: { targetLevel: 25, evolvesIntoId: 134 },
    // Default evolves to Vaporeon, or random
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/133.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/133.gif",
    description: "Its genetic code is irregular. It may mutate if it is exposed to radiation from element stones.",
    baseStats: { hp: 55, attack: 55, defense: 50, speed: 55 }
  },
  {
    id: 134,
    name: "Vaporeon",
    types: ["Water"],
    rarity: "RARE",
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/134.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/134.gif",
    description: "Lives close to water. Its long tail is ridged with a fin which is often mistaken for a mermaid's.",
    baseStats: { hp: 130, attack: 65, defense: 60, speed: 65 }
  },
  {
    id: 135,
    name: "Jolteon",
    types: ["Electric"],
    rarity: "RARE",
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/135.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/135.gif",
    description: "It accumulates negative ions in the atmosphere to blast out 10000-volt lightning bolts.",
    baseStats: { hp: 65, attack: 65, defense: 60, speed: 130 }
  },
  {
    id: 136,
    name: "Flareon",
    types: ["Fire"],
    rarity: "RARE",
    baseCatchRate: 30,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/136.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/136.gif",
    description: "When storing thermal energy in its body, its temperature could soar to over 1600 degrees.",
    baseStats: { hp: 65, attack: 130, defense: 60, speed: 65 }
  },
  {
    id: 196,
    name: "Espeon",
    types: ["Psychic"],
    rarity: "RARE",
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/196.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/196.gif",
    description: "By reading air currents, it can predict things such as the weather or its foe's next move.",
    baseStats: { hp: 65, attack: 65, defense: 60, speed: 110 }
  },
  {
    id: 197,
    name: "Umbreon",
    types: ["Dark"],
    rarity: "RARE",
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/197.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/197.gif",
    description: "When exposed to the moon's aura, the rings on its body glow faintly with a mysterious power.",
    baseStats: { hp: 95, attack: 65, defense: 110, speed: 65 }
  },
  // --- SNORLAX ---
  {
    id: 143,
    name: "Snorlax",
    types: ["Normal"],
    rarity: "RARE",
    baseCatchRate: 25,
    baseXpYield: 189,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/143.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/143.gif",
    description: "Very lazy. Just eats and sleeps. As its enormous bulk builds, it becomes steadily more inert.",
    baseStats: { hp: 160, attack: 110, defense: 65, speed: 30 }
  },
  // --- DRAGONITE LINE ---
  {
    id: 147,
    name: "Dratini",
    types: ["Dragon"],
    rarity: "UNCOMMON",
    baseCatchRate: 50,
    baseXpYield: 60,
    evolution: { targetLevel: 30, evolvesIntoId: 148 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/147.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/147.gif",
    description: "Long thought to be mythical until a small colony was found living underwater.",
    baseStats: { hp: 41, attack: 64, defense: 45, speed: 50 }
  },
  {
    id: 148,
    name: "Dragonair",
    types: ["Dragon"],
    rarity: "RARE",
    baseCatchRate: 30,
    baseXpYield: 147,
    evolution: { targetLevel: 55, evolvesIntoId: 149 },
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/148.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/148.gif",
    description: "A mystical Pok\xE9mon that exudes a gentle aura. It has the ability to change the climate.",
    baseStats: { hp: 61, attack: 84, defense: 65, speed: 70 }
  },
  {
    id: 149,
    name: "Dragonite",
    types: ["Dragon", "Flying"],
    rarity: "EPIC",
    baseCatchRate: 10,
    baseXpYield: 270,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/149.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/149.gif",
    description: "An extremely rarely seen marine Pok\xE9mon. Its intelligence is said to match that of humans.",
    baseStats: { hp: 91, attack: 134, defense: 95, speed: 80 }
  },
  // --- LUCARIO ---
  {
    id: 448,
    name: "Lucario",
    types: ["Fighting", "Steel"],
    rarity: "RARE",
    baseCatchRate: 25,
    baseXpYield: 184,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/448.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/448.gif",
    description: "It can read the thoughts and movements of others by sensing their auras.",
    baseStats: { hp: 70, attack: 110, defense: 70, speed: 90 }
  },
  // --- GRENINJA ---
  {
    id: 658,
    name: "Greninja",
    types: ["Water", "Dark"],
    rarity: "EPIC",
    baseCatchRate: 15,
    baseXpYield: 239,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/658.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/658.gif",
    description: "It creates throwing stars out of compressed water. When it throws them at high speed, they can split metal.",
    baseStats: { hp: 72, attack: 95, defense: 67, speed: 122 }
  },
  // --- LEGENDARIES ---
  {
    id: 150,
    name: "Mewtwo",
    types: ["Psychic"],
    rarity: "LEGENDARY",
    baseCatchRate: 5,
    baseXpYield: 306,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/150.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/150.gif",
    description: "It was created by a scientist after years of horrific gene splicing and DNA engineering.",
    baseStats: { hp: 106, attack: 110, defense: 90, speed: 130 }
  },
  {
    id: 151,
    name: "Mew",
    types: ["Psychic"],
    rarity: "MYTHICAL",
    baseCatchRate: 5,
    baseXpYield: 270,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/151.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/151.gif",
    description: "So rare that it is still said to be a mirage by many experts. Only a few people have seen it.",
    baseStats: { hp: 100, attack: 100, defense: 100, speed: 100 }
  },
  {
    id: 384,
    name: "Rayquaza",
    types: ["Dragon", "Flying"],
    rarity: "LEGENDARY",
    baseCatchRate: 5,
    baseXpYield: 306,
    spriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/384.gif",
    shinySpriteUrl: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/shiny/384.gif",
    description: "It flies endlessly in the ozone layer. It is said it would descend to earth only in extreme peril.",
    baseStats: { hp: 105, attack: 150, defense: 90, speed: 95 }
  }
];
var POKEMON_BY_ID = new Map(
  POKEMON_DATABASE.map((p) => [p.id, p])
);
var POKEMON_BY_RARITY = {
  COMMON: POKEMON_DATABASE.filter((p) => p.rarity === "COMMON"),
  UNCOMMON: POKEMON_DATABASE.filter((p) => p.rarity === "UNCOMMON"),
  RARE: POKEMON_DATABASE.filter((p) => p.rarity === "RARE"),
  EPIC: POKEMON_DATABASE.filter((p) => p.rarity === "EPIC"),
  LEGENDARY: POKEMON_DATABASE.filter((p) => p.rarity === "LEGENDARY"),
  MYTHICAL: POKEMON_DATABASE.filter((p) => p.rarity === "MYTHICAL")
};

// src/data/items.ts
var ITEMS_DATABASE = {
  pokeball: {
    id: "pokeball",
    name: "Pok\xE9 Ball",
    category: "BALL",
    catchBonus: 1,
    description: "A standard device for catching wild Pok\xE9mon. Earned every 25 keystrokes.",
    count: 10,
    icon: "[PB]"
  },
  greatball: {
    id: "greatball",
    name: "Great Ball",
    category: "BALL",
    catchBonus: 1.5,
    description: "A good, high-performance Ball that provides a higher catch rate than a standard Poke Ball.",
    count: 3,
    icon: "[GB]"
  },
  ultraball: {
    id: "ultraball",
    name: "Ultra Ball",
    category: "BALL",
    catchBonus: 2,
    description: "An ultra-high-performance Ball with a higher catch rate than a Great Ball.",
    count: 1,
    icon: "[UB]"
  },
  masterball: {
    id: "masterball",
    name: "Master Ball",
    category: "BALL",
    catchBonus: 999,
    // Guaranteed catch
    description: "The best Ball with the ultimate performance. It catches any wild Pokemon without fail.",
    count: 0,
    icon: "[MB]"
  },
  razzberry: {
    id: "razzberry",
    name: "Razz Berry",
    category: "BERRY",
    catchBonus: 1.25,
    description: "Feed this to a wild Pokemon to make it calmer and easier to catch on your next throw.",
    count: 5,
    icon: "[RZ]"
  },
  goldenrazz: {
    id: "goldenrazz",
    name: "Golden Razz Berry",
    category: "BERRY",
    catchBonus: 2.5,
    description: "A miraculous berry that drastically calms wild Pokemon and boosts catch chances.",
    count: 1,
    icon: "[GR]"
  }
};

// src/storage/save-manager.ts
var CURRENT_VERSION = "1.0.0";
var SaveManager = class {
  fs;
  saveTimeout = null;
  constructor(customPath) {
    this.fs = new PokeFileSystem(customPath);
  }
  getFileSystem() {
    return this.fs;
  }
  /**
   * Load or initialize trainer profile
   */
  loadTrainer() {
    const raw = this.fs.readJson("trainer.json");
    if (raw && raw.version) {
      return this.migrateTrainer(raw);
    }
    return this.createNewTrainer();
  }
  /**
   * Load or initialize game settings
   */
  loadSettings() {
    const raw = this.fs.readJson("settings.json");
    if (raw) {
      return raw;
    }
    const defaultSettings = {
      soundEnabled: true,
      volume: 0.7,
      encounterRateMultiplier: 1,
      notificationsEnabled: true,
      theme: "gameboy",
      autoThrowPokeball: false,
      spawnOnSave: true
    };
    this.fs.atomicWriteJson("settings.json", defaultSettings);
    return defaultSettings;
  }
  /**
   * Debounced save to reduce disk writes during active typing sessions
   */
  scheduleSave(trainer, settings) {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveNow(trainer, settings);
    }, 1500);
  }
  dispose() {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }
  saveNow(trainer, settings) {
    trainer.updatedAt = Date.now();
    this.fs.atomicWriteJson("trainer.json", trainer);
    if (settings) {
      this.fs.atomicWriteJson("settings.json", settings);
    }
    if (Math.random() < 0.05) {
      this.fs.createBackup("trainer.json");
    }
  }
  /**
   * Create fresh new trainer with starter Pikachu
   */
  createNewTrainer() {
    const starterSpecies = POKEMON_DATABASE.find((p) => p.id === 25) || POKEMON_DATABASE[0];
    const starterInstance = {
      instanceId: `pkmn_${Date.now()}_${Math.floor(Math.random() * 1e3)}`,
      speciesId: starterSpecies.id,
      name: starterSpecies.name,
      nickname: starterSpecies.name,
      level: 5,
      currentXp: 0,
      xpToNextLevel: 100,
      isShiny: false,
      caughtAt: Date.now(),
      caughtInLanguage: "TypeScript",
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
    const initialInventory = {};
    for (const [key, item] of Object.entries(ITEMS_DATABASE)) {
      initialInventory[key] = item.count;
    }
    const initialPokedex = {
      [starterSpecies.id]: {
        speciesId: starterSpecies.id,
        seen: true,
        caught: true,
        caughtCount: 1,
        firstCaughtAt: Date.now(),
        shinyCaught: false
      }
    };
    const newTrainer = {
      id: `trainer_${Date.now()}`,
      name: "Ash Koder",
      title: "Novice Code Trainer",
      level: 1,
      totalXp: 0,
      totalKeystrokes: 0,
      totalLinesCoded: 0,
      activeBuddyId: starterInstance.instanceId,
      party: [starterInstance],
      box: [],
      inventory: initialInventory,
      pokedex: initialPokedex,
      unlockedBadges: ["Code Beginner"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      version: CURRENT_VERSION
    };
    this.fs.atomicWriteJson("trainer.json", newTrainer);
    return newTrainer;
  }
  migrateTrainer(profile) {
    if (!profile.inventory) profile.inventory = {};
    if (!profile.party) profile.party = [];
    if (!profile.box) profile.box = [];
    if (!profile.pokedex) profile.pokedex = {};
    if (!profile.unlockedBadges) profile.unlockedBadges = [];
    profile.version = CURRENT_VERSION;
    return profile;
  }
};

// src/core/spawn-engine.ts
var SpawnEngine = class {
  /**
   * Roll a wild Pokémon encounter based on typing streak and trainer level
   */
  generateEncounter(trainer, currentStreak) {
    const rarity = this.rollRarity(currentStreak);
    const speciesList = POKEMON_BY_RARITY[rarity].length > 0 ? POKEMON_BY_RARITY[rarity] : POKEMON_DATABASE;
    const species = speciesList[Math.floor(Math.random() * speciesList.length)];
    const isShiny = this.rollShiny(currentStreak);
    const levelVariance = Math.floor(Math.random() * 5) - 2;
    const wildLevel = Math.max(2, trainer.level * 2 + levelVariance);
    const wildInstance = {
      instanceId: `encounter_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
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
      status: "ACTIVE",
      turnsRemaining: 5,
      // Turns before fleeing
      catchSuccessRate: species.baseCatchRate,
      logs: [`A wild ${species.name}${isShiny ? " [SHINY]" : ""} appeared!`],
      createdAt: Date.now()
    };
  }
  /**
   * Higher typing streaks increase chance of rarer Pokémon
   */
  rollRarity(streak) {
    const roll = Math.random() * 100;
    if (streak >= 150) {
      if (roll < 5) return "MYTHICAL";
      if (roll < 18) return "LEGENDARY";
      if (roll < 45) return "EPIC";
      if (roll < 75) return "RARE";
      return "UNCOMMON";
    } else if (streak >= 75) {
      if (roll < 3) return "LEGENDARY";
      if (roll < 15) return "EPIC";
      if (roll < 40) return "RARE";
      if (roll < 75) return "UNCOMMON";
      return "COMMON";
    } else if (streak >= 25) {
      if (roll < 5) return "EPIC";
      if (roll < 25) return "RARE";
      if (roll < 60) return "UNCOMMON";
      return "COMMON";
    } else {
      if (roll < 2) return "EPIC";
      if (roll < 12) return "RARE";
      if (roll < 40) return "UNCOMMON";
      return "COMMON";
    }
  }
  /**
   * Shiny roll: standard 1%, up to 6% with 100+ streak
   */
  rollShiny(streak) {
    const shinyChance = streak >= 100 ? 0.06 : streak >= 50 ? 0.03 : 0.015;
    return Math.random() < shinyChance;
  }
  /**
   * Calculate catch attempt result
   */
  attemptCatch(encounter, ballMultiplier = 1, berryMultiplier = 1) {
    if (ballMultiplier >= 999) {
      return { success: true, escaped: false, message: "All-right! Master Ball caught it effortlessly!" };
    }
    const effectiveRate = Math.min(
      95,
      encounter.species.baseCatchRate * ballMultiplier * berryMultiplier
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
    const escaped = encounter.turnsRemaining <= 0 || Math.random() < 0.25;
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
};

// src/core/evolution-engine.ts
var EvolutionEngine = class {
  /**
   * Add XP to a Pokémon instance and check for level-up and evolution
   */
  addXp(pokemon, amount) {
    pokemon.currentXp += amount;
    const oldLevel = pokemon.level;
    let leveledUp = false;
    let evolved = false;
    let oldSpecies;
    let newSpecies;
    const statGains = { hp: 0, attack: 0, defense: 0, speed: 0 };
    while (pokemon.currentXp >= pokemon.xpToNextLevel) {
      pokemon.currentXp -= pokemon.xpToNextLevel;
      pokemon.level += 1;
      leveledUp = true;
      pokemon.xpToNextLevel = Math.floor(pokemon.level * 45 + pokemon.level ** 1.3);
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
  applyEvolution(pokemon, newSpecies) {
    const oldSpecies = POKEMON_BY_ID.get(pokemon.speciesId);
    if (!pokemon.nickname || oldSpecies && pokemon.nickname === oldSpecies.name) {
      pokemon.nickname = newSpecies.name;
    }
    pokemon.speciesId = newSpecies.id;
    pokemon.name = newSpecies.name;
    pokemon.types = [...newSpecies.types];
    pokemon.spriteUrl = pokemon.isShiny ? newSpecies.shinySpriteUrl : newSpecies.spriteUrl;
    pokemon.stats.maxHp = Math.floor(newSpecies.baseStats.hp * (1 + pokemon.level * 0.05));
    pokemon.stats.hp = pokemon.stats.maxHp;
    pokemon.stats.attack = Math.floor(newSpecies.baseStats.attack * (1 + pokemon.level * 0.05));
    pokemon.stats.defense = Math.floor(newSpecies.baseStats.defense * (1 + pokemon.level * 0.05));
    pokemon.stats.speed = Math.floor(newSpecies.baseStats.speed * (1 + pokemon.level * 0.05));
  }
};

// src/terminal/sprites.ts
var R = "\x1B[0m";
var Y = "\x1B[38;5;220m";
var O = "\x1B[38;5;208m";
var RED = "\x1B[38;5;196m";
var G = "\x1B[38;5;42m";
var DG = "\x1B[38;5;28m";
var B = "\x1B[38;5;39m";
var P = "\x1B[38;5;129m";
var BR = "\x1B[38;5;136m";
var W = "\x1B[38;5;255m";
var K = "\x1B[38;5;236m";
var PK = "\x1B[38;5;212m";
var T = "\x1B[38;5;44m";
var ANSI_SPRITES = {
  // Pikachu (ID: 25)
  25: [
    `${Y}  \u2584\u2588\u2584       \u2584\u2588\u2584  ${R}`,
    `${Y}  \u2588\u2588\u2588\u2588     \u2588\u2588\u2588\u2588  ${R}`,
    `${K}  \u2580\u2588\u2588\u2588     \u2588\u2588\u2588\u2580  ${R}`,
    `${Y} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${Y} \u2588${K}\u2580${Y}\u2588\u2588${K}\u2580${Y}\u2588\u2588\u2588\u2588\u2588${K}\u2580${Y}\u2588\u2588${K}\u2580${Y}\u2588 ${R}`,
    `${Y} \u2588${RED}\u2588${Y}\u2588\u2588\u2588${K}\u2584\u2584\u2584${Y}\u2588\u2588\u2588${RED}\u2588${Y}\u2588 ${R}`,
    `${Y}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  ${R}`,
    `${Y}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${Y} \u2584\u2588\u2580 \u2588 \u2580\u2588\u2580 \u2588 \u2580\u2588\u2584 ${R}`,
    `${Y} \u2580\u2580  \u2580     \u2580  \u2580\u2580 ${R}`
  ],
  // Raichu (ID: 26)
  26: [
    `${O}   \u2584\u2588\u2584     \u2584\u2588\u2584   ${R}`,
    `${O}  \u2588\u2588\u2588\u2588\u2588   \u2588\u2588\u2588\u2588\u2588  ${R}`,
    `${BR}  \u2588\u2588\u2580\u2580     \u2580\u2580\u2588\u2588  ${R}`,
    `${O} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${O} \u2588${K}\u2580${O}\u2588\u2588${W}\u2588${O}\u2588\u2588\u2588\u2588\u2588${W}\u2588${O}\u2588\u2588${K}\u2580${O}\u2588 ${R}`,
    `${O} \u2588${Y}\u2588${O}\u2588\u2588\u2588${K}\u2584\u2584\u2584${O}\u2588\u2588\u2588${Y}\u2588${O}\u2588 ${R}`,
    `${W}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  ${R}`,
    `${BR}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${Y}  *   \u2588\u2588\u2588   \u2588\u2588\u2588    ${R}`
  ],
  // Bulbasaur (ID: 1)
  1: [
    `${DG}     \u2584\u2588\u2588\u2588\u2588\u2584      ${R}`,
    `${DG}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588     ${R}`,
    `${T}   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584    ${R}`,
    `${T}  \u2588\u2588${K}\u2588${T}\u2588\u2588\u2588\u2588\u2588\u2588${K}\u2588${T}\u2588\u2588  ${R}`,
    `${T}  \u2588\u2588\u2588\u2588${RED}\u2584\u2584\u2584\u2584${T}\u2588\u2588\u2588\u2588  ${R}`,
    `${T} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${DG} \u2588${T}\u2588\u2588${DG}\u2588${T}\u2588\u2588\u2588\u2588\u2588\u2588${DG}\u2588${T}\u2588\u2588${DG}\u2588  ${R}`,
    `${T}  \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580   ${R}`
  ],
  // Ivysaur (ID: 2)
  2: [
    `${PK}     \u2584\u2588\u2584 \u2584\u2588\u2584     ${R}`,
    `${PK}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588    ${R}`,
    `${DG}   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584   ${R}`,
    `${T}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${T}  \u2588\u2588${K}\u2588${T}\u2588\u2588\u2588\u2588\u2588\u2588\u2588${K}\u2588${T}\u2588\u2588 ${R}`,
    `${T} \u2584\u2588\u2588\u2588\u2588${RED}\u2580\u2580\u2580\u2580${T}\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${T} \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${T}  \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Venusaur (ID: 3)
  3: [
    `${PK}    \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${PK}   \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${DG}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${T} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${T} \u2588\u2588${RED}\u2588${T}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${RED}\u2588${T}\u2588\u2588${R}`,
    `${T}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${R}`,
    `${T} \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580 ${R}`
  ],
  // Charmander (ID: 4)
  4: [
    `${O}      \u2584\u2588\u2588\u2588\u2588\u2584     ${R}`,
    `${O}     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588    ${R}`,
    `${O}    \u2588\u2588${B}\u2588${O}\u2588\u2588\u2588\u2588${B}\u2588${O}\u2588\u2588   ${R}`,
    `${O}    \u2588\u2588\u2588${W}\u2584\u2584\u2584\u2584${O}\u2588\u2588\u2588   ${R}`,
    `${O}    \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584   ${R}`,
    `${O}   \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${O}\u2588\u2588\u2588\u2588  ${R}${RED}*${R}`,
    `${O}  \u2584\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${O}\u2588\u2588\u2588\u2588\u2584 ${R}${Y}\u2588${R}`,
    `${O}   \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Charmeleon (ID: 5)
  5: [
    `${RED}      \u2584\u2588\u2588\u2588\u2588\u2584\u2584    ${R}`,
    `${RED}     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${RED}    \u2588\u2588${B}\u2588${RED}\u2588\u2588\u2588\u2588${B}\u2588${RED}\u2588\u2588  ${R}`,
    `${RED}    \u2588\u2588\u2588${W}\u2580\u2580\u2580\u2580${RED}\u2588\u2588\u2588  ${R}`,
    `${RED}    \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584   ${R}`,
    `${RED}   \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${RED}\u2588\u2588\u2588\u2588  ${R}${RED}*${R}`,
    `${RED}  \u2584\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${RED}\u2588\u2588\u2588\u2588\u2584 ${R}${Y}\u2588\u2588${R}`,
    `${RED}   \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Charizard (ID: 6)
  6: [
    `${T} \u2584\u2588\u2584${R}${O}   \u2584\u2588\u2588\u2588\u2588\u2584   ${R}${T}\u2584\u2588\u2584 ${R}`,
    `${T}\u2588\u2588\u2588\u2588${R}${O}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588  ${R}${T}\u2588\u2588\u2588\u2588${R}`,
    `${T}\u2580\u2588\u2588\u2588${R}${O} \u2588\u2588${B}\u2588${O}\u2588\u2588\u2588\u2588${B}\u2588${O}\u2588\u2588 ${R}${T}\u2588\u2588\u2588\u2580${R}`,
    `${O}  \u2580\u2588\u2584\u2588\u2588${W}\u2580\u2580\u2580\u2580${O}\u2588\u2588\u2584\u2588\u2580  ${R}`,
    `${O}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588    ${R}`,
    `${O}   \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588${O}\u2588\u2588\u2588\u2588 ${R}${RED}*${R}`,
    `${O}  \u2584\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588${O}\u2588\u2588\u2588\u2588\u2584${R}${Y}\u2588${R}`,
    `${O}   \u2580\u2588\u2588\u2580\u2580    \u2580\u2580\u2588\u2588\u2580 ${R}`
  ],
  // Squirtle (ID: 7)
  7: [
    `${B}      \u2584\u2588\u2588\u2588\u2588\u2584     ${R}`,
    `${B}     \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588    ${R}`,
    `${B}    \u2588\u2588${RED}\u2588${B}\u2588\u2588\u2588\u2588${RED}\u2588${B}\u2588\u2588   ${R}`,
    `${B}    \u2588\u2588\u2588${W}\u2584\u2584\u2584\u2584${B}\u2588\u2588\u2588   ${R}`,
    `${BR}    \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584   ${R}`,
    `${BR}   \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${BR}\u2588\u2588\u2588\u2588  ${R}`,
    `${B}  \u2584\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588${B}\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${B}   \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Wartortle (ID: 8)
  8: [
    `${W}  \u2584\u2588\u2584        \u2584\u2588\u2584 ${R}`,
    `${B}   \u2580\u2588\u2588\u2584\u2584\u2584\u2584\u2584\u2584\u2588\u2588\u2580  ${R}`,
    `${B}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588   ${R}`,
    `${B}   \u2588\u2588${RED}\u2588${B}\u2588\u2588\u2588\u2588\u2588\u2588${RED}\u2588${B}\u2588\u2588  ${R}`,
    `${BR}   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${BR}  \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588${BR}\u2588\u2588\u2588\u2588 ${R}`,
    `${W} \u2584\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588${W}\u2588\u2588\u2588\u2588\u2584${R}`,
    `${B}  \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580 ${R}`
  ],
  // Blastoise (ID: 9)
  9: [
    `${K} \u2584\u2588\u2584          \u2584\u2588\u2584${R}`,
    `${K} \u2588\u2588\u2588\u2584${R}${B}\u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}${K}\u2584\u2588\u2588\u2588${R}`,
    `${B}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${B}  \u2588\u2588${RED}\u2588${B}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${RED}\u2588${B}\u2588\u2588 ${R}`,
    `${BR} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${BR}\u2588\u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${BR}\u2588\u2588\u2588\u2588\u2588${R}`,
    `${B} \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580${R}`
  ],
  // Gastly / Gengar (ID: 94)
  94: [
    `${P}   \u2584\u2588\u2584      \u2584\u2588\u2584  ${R}`,
    `${P}  \u2588\u2588\u2588\u2588\u2588    \u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${P} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${P} \u2588\u2588${RED}\u2588${W}\u2588${P}\u2588\u2588\u2588\u2588\u2588\u2588${W}\u2588${RED}\u2588${P}\u2588\u2588${R}`,
    `${P} \u2588${W}\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580${P}\u2588 ${R}`,
    `${P} \u2588${W}\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584\u2584${P}\u2588 ${R}`,
    `${P} \u2580\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2580${R}`,
    `${P}   \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Eevee (ID: 133)
  133: [
    `${BR}  \u2584\u2588\u2588\u2584      \u2584\u2588\u2588\u2584 ${R}`,
    `${BR}  \u2588\u2588\u2588\u2588\u2588    \u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${BR}   \u2580\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2580  ${R}`,
    `${BR}   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584  ${R}`,
    `${BR}   \u2588\u2588${K}\u2588${BR}\u2588\u2588\u2588\u2588\u2588\u2588${K}\u2588${BR}\u2588\u2588  ${R}`,
    `${W}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${W}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${BR}   \u2580\u2588\u2588\u2580\u2580    \u2580\u2580\u2588\u2588\u2580${R}`
  ],
  // Snorlax (ID: 143)
  143: [
    `${T}   \u2584\u2588\u2584      \u2584\u2588\u2584  ${R}`,
    `${T}  \u2588\u2588\u2588\u2588\u2588\u2584\u2584\u2584\u2584\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${T} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${T} \u2588\u2588${W}\u2580\u2580${T}\u2588\u2588\u2588\u2588\u2588\u2588${W}\u2580\u2580${T}\u2588\u2588${R}`,
    `${W}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 ${R}`,
    `${W} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584${R}`,
    `${W} \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${R}`,
    `${T}  \u2580\u2588\u2588\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2588\u2588\u2580 ${R}`
  ],
  // Dragonite (ID: 149)
  149: [
    `${O}      \u2584\u2584\u2584\u2584\u2584\u2584     ${R}`,
    `${DG} \u2584\u2588\u2584 ${R}${O}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${R}${DG} \u2584\u2588\u2584 ${R}`,
    `${DG}\u2588\u2588\u2588\u2588${R}${O}\u2588\u2588${B}\u2588${O}\u2588\u2588\u2588\u2588${B}\u2588${O}\u2588\u2588${R}${DG}\u2588\u2588\u2588\u2588${R}`,
    `${O} \u2580\u2588\u2588\u2588\u2588${W}\u2580\u2580\u2580\u2580${O}\u2588\u2588\u2588\u2588\u2580 ${R}`,
    `${O}  \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584   ${R}`,
    `${O} \u2588\u2588\u2588\u2588${Y}\u2588\u2588\u2588\u2588\u2588\u2588${O}\u2588\u2588\u2588\u2588  ${R}`,
    `${O}  \u2580\u2588\u2588\u2580\u2580    \u2580\u2580\u2588\u2588\u2580 ${R}`
  ],
  // Mewtwo (ID: 150)
  150: [
    `${W}     \u2584\u2588\u2588\u2588\u2588\u2584      ${R}`,
    `${W}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588     ${R}`,
    `${W}   \u2588\u2588${P}\u2588${W}\u2588\u2588\u2588\u2588${P}\u2588${W}\u2588\u2588    ${R}`,
    `${W}    \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588     ${R}`,
    `${W}     \u2584\u2588\u2588\u2588\u2588\u2584      ${R}`,
    `${P}   \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584    ${R}`,
    `${P}  \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588   ${R}`,
    `${P}   \u2580\u2588\u2588\u2580\u2580  \u2580\u2580\u2588\u2588\u2580  ${R}`
  ],
  // Rayquaza (ID: 384)
  384: [
    `${G}  \u2584\u2588\u2588\u2584        \u2584\u2588\u2588\u2584  ${R}`,
    `${G}  \u2588\u2588\u2588\u2588\u2588\u2584\u2584\u2584\u2584\u2584\u2584\u2588\u2588\u2588\u2588\u2588  ${R}`,
    `${G} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${G} \u2588\u2588${Y}\u2588${RED}\u2588${G}\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588${RED}\u2588${Y}\u2588${G}\u2588\u2588 ${R}`,
    `${G}  \u2588\u2588\u2588${Y}\u2580\u2580\u2580\u2580\u2580\u2580\u2580\u2580${G}\u2588\u2588\u2588   ${R}`,
    `${G} \u2584\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2584 ${R}`,
    `${G}  \u2580\u2588\u2588\u2580\u2580      \u2580\u2580\u2588\u2588\u2580  ${R}`
  ]
};
function getSprite(speciesId) {
  return ANSI_SPRITES[speciesId] || ANSI_SPRITES[25];
}

// src/terminal/word-tracker.ts
var C = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m"
};
var WordTracker = class {
  sessionFile;
  session;
  saveManager;
  spawnEngine;
  evolutionEngine;
  constructor() {
    const pokeDir = path2.join(os2.homedir(), ".pokecode");
    if (!fs2.existsSync(pokeDir)) {
      fs2.mkdirSync(pokeDir, { recursive: true });
    }
    this.sessionFile = path2.join(pokeDir, "terminal_session.json");
    this.saveManager = new SaveManager();
    this.spawnEngine = new SpawnEngine();
    this.evolutionEngine = new EvolutionEngine();
    this.session = this.loadSession();
  }
  loadSession() {
    if (fs2.existsSync(this.sessionFile)) {
      try {
        const raw = fs2.readFileSync(this.sessionFile, "utf-8");
        return JSON.parse(raw);
      } catch (_) {
      }
    }
    return {
      wordsTyped: 0,
      targetWords: 8,
      totalWords: 0,
      totalSpawns: 0,
      enabled: true
    };
  }
  saveSession() {
    try {
      fs2.writeFileSync(this.sessionFile, JSON.stringify(this.session, null, 2), "utf-8");
    } catch (_) {
    }
  }
  getSession() {
    return { ...this.session };
  }
  setEnabled(enabled) {
    this.session.enabled = enabled;
    this.saveSession();
  }
  setTargetWords(count) {
    this.session.targetWords = Math.max(1, count);
    this.saveSession();
  }
  /**
   * Process a command or text string executed in terminal
   */
  processInput(text) {
    if (!this.session.enabled || !text) return false;
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith("pokecode") || trimmed.startsWith("_pokecode")) {
      return false;
    }
    const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    if (wordCount === 0) return false;
    this.session.wordsTyped += wordCount;
    this.session.totalWords += wordCount;
    this.session.lastCommand = trimmed;
    let spawned = false;
    if (this.session.wordsTyped >= this.session.targetWords) {
      const spawnsToTrigger = Math.floor(this.session.wordsTyped / this.session.targetWords);
      this.session.wordsTyped = this.session.wordsTyped % this.session.targetWords;
      this.session.totalSpawns += spawnsToTrigger;
      for (let i = 0; i < Math.min(3, spawnsToTrigger); i++) {
        this.triggerTerminalSpawn();
        spawned = true;
      }
    }
    this.saveSession();
    return spawned;
  }
  /**
   * Spawns wild Pokémon directly into the terminal output
   */
  triggerTerminalSpawn() {
    const trainer = this.saveManager.loadTrainer();
    const streak = Math.min(100, Math.floor(this.session.totalWords / 4));
    const encounter = this.spawnEngine.generateEncounter(trainer, streak);
    const pokemon = encounter.pokemon;
    const species = encounter.species;
    const ballType = (trainer.inventory["pokeball"] || 0) > 0 ? "pokeball" : "greatball";
    const hasBall = (trainer.inventory[ballType] || 0) > 0;
    let caught = false;
    if (hasBall) {
      trainer.inventory[ballType] -= 1;
      const catchResult = this.spawnEngine.attemptCatch(encounter, 1.2);
      caught = catchResult.success;
    } else {
      trainer.inventory["pokeball"] = 5;
      caught = true;
    }
    if (caught) {
      if (trainer.party.length < 6) {
        trainer.party.push(pokemon);
      } else {
        trainer.box.push(pokemon);
      }
      const pEntry = trainer.pokedex[pokemon.speciesId] || {
        speciesId: pokemon.speciesId,
        seen: true,
        caught: false,
        caughtCount: 0,
        shinyCaught: false
      };
      pEntry.seen = true;
      pEntry.caught = true;
      pEntry.caughtCount += 1;
      if (pokemon.isShiny) pEntry.shinyCaught = true;
      trainer.pokedex[pokemon.speciesId] = pEntry;
      const buddy = trainer.party.find((p) => p.instanceId === trainer.activeBuddyId) || trainer.party[0];
      let levelUpMsg = "";
      if (buddy) {
        const xpGain = Math.floor(species.baseXpYield * 0.7);
        const lvlRes = this.evolutionEngine.addXp(buddy, xpGain);
        if (lvlRes.evolved && lvlRes.newSpecies) {
          levelUpMsg = `
  ${C.magenta}${C.bold}WHAT?! ${buddy.nickname} evolved into ${lvlRes.newSpecies.name}!${C.reset}`;
        } else if (lvlRes.leveledUp) {
          levelUpMsg = `
  ${C.cyan}${C.bold}[LEVEL UP] ${buddy.nickname} grew to Lv. ${buddy.level}!${C.reset}`;
        }
      }
      this.saveManager.saveNow(trainer);
      this.renderSpawnBanner(encounter, caught, levelUpMsg);
      this.sendDesktopNotification(species.name, pokemon.level, pokemon.isShiny);
    } else {
      this.renderSpawnBanner(encounter, false);
      this.sendDesktopNotification(species.name, pokemon.level, pokemon.isShiny, false);
    }
  }
  renderSpawnBanner(encounter, caught, extraMsg = "") {
    const { pokemon, species } = encounter;
    const shiny = pokemon.isShiny ? ` ${C.yellow}${C.bold}[SHINY]${C.reset}` : "";
    const spriteLines = getSprite(species.id);
    console.log("");
    console.log(`${C.yellow}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${C.reset}`);
    console.log(`${C.yellow}\u2551${C.reset}  ${C.bold}WILD POKEMON ENCOUNTER!${C.reset} ${C.dim}(8 Words Typed in Terminal)${C.reset}               ${C.yellow}\u2551${C.reset}`);
    console.log(`${C.yellow}\u2560\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2563${C.reset}`);
    const infoLines = [
      ` ${C.bold}${C.white}${species.name}${C.reset}${shiny}  ${C.cyan}Lv.${pokemon.level}${C.reset}`,
      ` ${C.dim}Type:${C.reset} ${species.types.join("/")}  |  ${C.dim}Rarity:${C.reset} ${species.rarity}`,
      ` ${C.dim}HP:${C.reset}   ${pokemon.stats.hp} / ${pokemon.stats.maxHp}`,
      ` `,
      caught ? ` ${C.red}[PB]${C.reset} ${C.bold}Threw Poke Ball...${C.reset} ${C.green}${C.bold}Gotcha! ${species.name} was caught!${C.reset}` : ` ${C.red}[PB]${C.reset} ${C.dim}Threw Poke Ball... Oh no! ${species.name} escaped!${C.reset}`,
      ` ${C.dim}Total Words Typed:${C.reset} ${C.yellow}${this.session.totalWords}${C.reset} | ${C.dim}Spawns:${C.reset} ${C.green}${this.session.totalSpawns}${C.reset}`
    ];
    const maxLines = Math.max(spriteLines.length, infoLines.length);
    for (let i = 0; i < maxLines; i++) {
      const sprite = spriteLines[i] || "                  ";
      const info = infoLines[i] || "";
      console.log(`  ${sprite}   ${info}`);
    }
    if (extraMsg) {
      console.log(extraMsg);
    }
    console.log(`${C.yellow}\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C.reset}
`);
  }
  sendDesktopNotification(pokemonName, level, isShiny, caught = true) {
    const title = `VS POKECODE: Wild ${pokemonName}!`;
    const shinyStr = isShiny ? " [Shiny]" : "";
    const body = caught ? `A wild Lv.${level} ${pokemonName}${shinyStr} appeared and was caught in your Poke Ball!` : `A wild Lv.${level} ${pokemonName}${shinyStr} appeared, but fled!`;
    (0, import_child_process.exec)(`notify-send -t 3000 "${title}" "${body}" 2>/dev/null`, () => {
    });
  }
};

// src/terminal/plugin-installer.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));
var os3 = __toESM(require("os"));
var PluginInstaller = class {
  pokeDir;
  pluginFile;
  bashrcFile;
  constructor() {
    this.pokeDir = path3.join(os3.homedir(), ".pokecode");
    this.pluginFile = path3.join(this.pokeDir, "pokecode.plugin.bash");
    this.bashrcFile = path3.join(os3.homedir(), ".bashrc");
    if (!fs3.existsSync(this.pokeDir)) {
      fs3.mkdirSync(this.pokeDir, { recursive: true });
    }
  }
  generatePluginScript() {
    const scriptContent = `# VS POKECODE Shell Plugin
# Spawns wild Pok\xE9mon directly in your terminal every 8 words typed!

_pokecode_prompt_hook() {
  local last_cmd
  last_cmd=$(HISTTIMEFORMAT= history 1 2>/dev/null | sed 's/^[ ]*[0-9]*[ ]*//')

  if [ -n "$last_cmd" ] && [ "$last_cmd" != "$_POKECODE_PREV_CMD" ]; then
    _POKECODE_PREV_CMD="$last_cmd"
    pokecode hook "$last_cmd"
  fi
}

if [[ "$PROMPT_COMMAND" != *"_pokecode_prompt_hook"* ]]; then
  if [ -z "$PROMPT_COMMAND" ]; then
    PROMPT_COMMAND="_pokecode_prompt_hook"
  else
    PROMPT_COMMAND="_pokecode_prompt_hook; $PROMPT_COMMAND"
  fi
fi
`;
    fs3.writeFileSync(this.pluginFile, scriptContent, "utf-8");
  }
  installToBashrc() {
    this.generatePluginScript();
    if (!fs3.existsSync(this.bashrcFile)) {
      return false;
    }
    const bashrc = fs3.readFileSync(this.bashrcFile, "utf-8");
    const sourceLine = `
# VS POKECODE Terminal Plugin (spawns wild Pok\xE9mon every 8 words)
[ -f "$HOME/.pokecode/pokecode.plugin.bash" ] && source "$HOME/.pokecode/pokecode.plugin.bash"
`;
    if (!bashrc.includes("pokecode.plugin.bash")) {
      fs3.appendFileSync(this.bashrcFile, sourceLine, "utf-8");
      return true;
    }
    return false;
  }
  uninstallFromBashrc() {
    if (!fs3.existsSync(this.bashrcFile)) return;
    let bashrc = fs3.readFileSync(this.bashrcFile, "utf-8");
    bashrc = bashrc.replace(/\n# VS POKECODE Terminal Plugin[\s\S]*?pokecode\.plugin\.bash"/g, "");
    fs3.writeFileSync(this.bashrcFile, bashrc, "utf-8");
  }
};

// src/terminal/interactive-watcher.ts
var readline = __toESM(require("readline"));
var C2 = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m"
};
function startInteractiveWatcher() {
  const tracker2 = new WordTracker();
  tracker2.setEnabled(true);
  console.log(`
${C2.bold}${C2.cyan}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${C2.reset}`);
  console.log(`${C2.bold}${C2.cyan}\u2551   VS POKECODE - Interactive Terminal Typing Mode              \u2551${C2.reset}`);
  console.log(`${C2.bold}${C2.cyan}\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C2.reset}`);
  console.log(`${C2.dim}Type any text or code below. Every 8 words, a wild Pokemon spawns!${C2.reset}`);
  console.log(`${C2.dim}Press Ctrl+C or type 'exit' to quit.${C2.reset}
`);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${C2.green}pokecode > ${C2.reset}`
  });
  rl.prompt();
  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed.toLowerCase() === "exit" || trimmed.toLowerCase() === "quit") {
      rl.close();
      return;
    }
    if (trimmed.length > 0) {
      const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
      const session = tracker2.getSession();
      const currentWords = session.wordsTyped;
      const target = session.targetWords || 8;
      console.log(`${C2.dim}Typed ${words.length} words. Progress: [${(currentWords + words.length) % target}/${target} words]${C2.reset}`);
      tracker2.processInput(line);
    }
    rl.prompt();
  });
  rl.on("close", () => {
    console.log(`
${C2.yellow}Trainer session paused! Your progress is saved.${C2.reset}
`);
    process.exit(0);
  });
}

// src/terminal/cli.ts
var import_child_process2 = require("child_process");
var C3 = {
  reset: "\x1B[0m",
  bold: "\x1B[1m",
  dim: "\x1B[2m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m"
};
var BANNER = `
${C3.red}${C3.bold}\u2588\u2588\u2557   \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557    ${C3.yellow}\u2588\u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2557  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557 \u2588\u2588\u2588\u2588\u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
${C3.red}${C3.bold}\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D    ${C3.yellow}\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2551 \u2588\u2588\u2554\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D\u2588\u2588\u2554\u2550\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2588\u2588\u2557\u2588\u2588\u2554\u2550\u2550\u2550\u2550\u255D
${C3.white}${C3.bold}\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557    ${C3.yellow}\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2557  \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2588\u2588\u2588\u2557  
${C3.white}${C3.bold}\u255A\u2588\u2588\u2557 \u2588\u2588\u2554\u255D\u255A\u2550\u2550\u2550\u2550\u2588\u2588\u2551    ${C3.yellow}\u2588\u2588\u2554\u2550\u2550\u2550\u255D \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2588\u2588\u2557 \u2588\u2588\u2554\u2550\u2550\u255D  \u2588\u2588\u2551     \u2588\u2588\u2551   \u2588\u2588\u2551\u2588\u2588\u2551  \u2588\u2588\u2551\u2588\u2588\u2554\u2550\u2550\u255D  
${C3.cyan}${C3.bold} \u255A\u2588\u2588\u2588\u2588\u2554\u255D \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2551    ${C3.yellow}\u2588\u2588\u2551     \u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2551  \u2588\u2588\u2557\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2557\u255A\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2554\u255D\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2557
${C3.cyan}${C3.bold}  \u255A\u2550\u2550\u2550\u255D  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D    ${C3.yellow}\u255A\u2550\u255D      \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u255D  \u255A\u2550\u255D\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u255D \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C3.reset}
                                                                  ${C3.dim}v0.1.0${C3.reset}
`;
function showHelp() {
  console.log(BANNER);
  console.log(`${C3.bold}TERMINAL PLUGIN & COMPANION:${C3.reset}`);
  console.log(`  ${C3.green}pokecode on${C3.reset}             Enable shell plugin in ~/.bashrc (spawns every 8 words!)`);
  console.log(`  ${C3.green}pokecode off${C3.reset}            Disable shell plugin in ~/.bashrc`);
  console.log(`  ${C3.green}pokecode watch${C3.reset}          Interactive typing mode (spawns every 8 words in console)`);
  console.log(`  ${C3.green}pokecode spawn${C3.reset}          Summon a wild Pok\xE9mon encounter immediately`);
  console.log(`  ${C3.green}pokecode stats${C3.reset}          View your live Pok\xE9mon trainer card & keystrokes`);
  console.log(`  ${C3.green}pokecode dex${C3.reset}            Display your Pok\xE9dex discoveries & caught Pok\xE9mon`);
  console.log(`  ${C3.green}pokecode web${C3.reset}            Launch the browser visual preview`);
  console.log(`  ${C3.green}pokecode code [dir]${C3.reset}     Launch VS Code with PokeCode ready
`);
}
function showStats() {
  console.log(BANNER);
  const sm = new SaveManager();
  const trainer = sm.loadTrainer();
  const tracker2 = new WordTracker();
  const session = tracker2.getSession();
  const buddy = trainer.party.find((p) => p.instanceId === trainer.activeBuddyId) || trainer.party[0];
  console.log(`${C3.bold}${C3.cyan}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${C3.reset}`);
  console.log(`${C3.bold}${C3.cyan}\u2551                    TRAINER CARD                               \u2551${C3.reset}`);
  console.log(`${C3.bold}${C3.cyan}\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C3.reset}`);
  console.log(`  ${C3.bold}Trainer:${C3.reset}     ${trainer.name} (${trainer.title})`);
  console.log(`  ${C3.bold}Level:${C3.reset}       ${C3.yellow}Lv. ${trainer.level}${C3.reset} (${trainer.totalXp} Total EXP)`);
  console.log(`  ${C3.bold}Words Typed:${C3.reset} ${C3.green}${session.totalWords} words${C3.reset} | ${C3.yellow}${session.totalSpawns} Pok\xE9mon spawned${C3.reset}`);
  console.log(`  ${C3.bold}Next Spawn:${C3.reset}  ${session.wordsTyped} / ${session.targetWords} words typed`);
  if (buddy) {
    const shiny = buddy.isShiny ? " [SHINY]" : "";
    console.log(`  ${C3.bold}Companion:${C3.reset}   ${C3.magenta}${buddy.nickname}${shiny}${C3.reset} (Lv. ${buddy.level} | ${buddy.types.join("/")})`);
    console.log(`  ${C3.bold}Buddy EXP:${C3.reset}   ${buddy.currentXp} / ${buddy.xpToNextLevel} to next level`);
  }
  console.log(`  ${C3.bold}Poke Bag:${C3.reset}    [PB] ${trainer.inventory.pokeball || 0} Poke Balls | [GB] ${trainer.inventory.greatball || 0} Great | [UB] ${trainer.inventory.ultraball || 0} Ultra`);
  console.log(`  ${C3.bold}Party:${C3.reset}       ${trainer.party.length} / 6 Pokemon (${trainer.box?.length || 0} in PC storage)
`);
}
function showDex() {
  console.log(BANNER);
  const sm = new SaveManager();
  const trainer = sm.loadTrainer();
  const entries = Object.values(trainer.pokedex);
  const caughtCount = entries.filter((e) => e.caught).length;
  console.log(`${C3.bold}${C3.cyan}\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557${C3.reset}`);
  console.log(`${C3.bold}${C3.cyan}\u2551                  POKEDEX ARCHIVE                              \u2551${C3.reset}`);
  console.log(`${C3.bold}${C3.cyan}\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D${C3.reset}`);
  console.log(`  ${C3.bold}Completion:${C3.reset} ${C3.green}${caughtCount} Caught${C3.reset} / ${entries.length} Seen
`);
  entries.forEach((e) => {
    const status = e.caught ? `${C3.green}${e.shinyCaught ? "[Caught Shiny]" : "[Caught]"}${C3.reset}` : `${C3.yellow}[Seen]${C3.reset}`;
    console.log(`  #${String(e.speciesId).padStart(3, "0")} : ${status}`);
  });
  console.log("");
}
var args = process.argv.slice(2);
var command = args[0] || "watch";
var installer = new PluginInstaller();
var tracker = new WordTracker();
switch (command) {
  case "on":
  case "enable":
  case "install":
    installer.installToBashrc();
    tracker.setEnabled(true);
    console.log(`${C3.green}${C3.bold}VS POKECODE Terminal Plugin Enabled!${C3.reset}`);
    console.log(`A wild Pokemon will now spawn directly in your terminal every 8 words typed!`);
    console.log(`${C3.dim}Tip: Run 'source ~/.bashrc' or open a new terminal window to activate.${C3.reset}
`);
    break;
  case "off":
  case "disable":
  case "uninstall":
    installer.uninstallFromBashrc();
    tracker.setEnabled(false);
    console.log(`${C3.yellow}VS POKECODE Terminal Plugin Disabled.${C3.reset}
`);
    break;
  case "hook":
    const cmdText = args.slice(1).join(" ");
    tracker.processInput(cmdText);
    break;
  case "spawn":
    tracker.triggerTerminalSpawn();
    break;
  case "watch":
  case "live":
    startInteractiveWatcher();
    break;
  case "stats":
    showStats();
    break;
  case "dex":
  case "pokedex":
    showDex();
    break;
  case "code":
  case "vs":
    const dir = args[1] || ".";
    console.log(`${C3.green}Opening VS Code with VS POKECODE in ${dir}...${C3.reset}`);
    (0, import_child_process2.spawn)("code", [dir], { stdio: "inherit", detached: true });
    break;
  case "help":
  case "--help":
  case "-h":
    showHelp();
    break;
  default:
    if (args.length > 0) {
      const fullText = args.join(" ");
      tracker.processInput(fullText);
    } else {
      startInteractiveWatcher();
    }
    break;
}
