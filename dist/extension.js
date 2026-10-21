"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode3 = __toESM(require("vscode"));

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
    icon: "\u{1F534}"
  },
  greatball: {
    id: "greatball",
    name: "Great Ball",
    category: "BALL",
    catchBonus: 1.5,
    description: "A good, high-performance Ball that provides a higher catch rate than a standard Pok\xE9 Ball.",
    count: 3,
    icon: "\u{1F535}"
  },
  ultraball: {
    id: "ultraball",
    name: "Ultra Ball",
    category: "BALL",
    catchBonus: 2,
    description: "An ultra-high-performance Ball with a higher catch rate than a Great Ball.",
    count: 1,
    icon: "\u{1F7E1}"
  },
  masterball: {
    id: "masterball",
    name: "Master Ball",
    category: "BALL",
    catchBonus: 999,
    // Guaranteed catch
    description: "The best Ball with the ultimate performance. It catches any wild Pok\xE9mon without fail.",
    count: 0,
    icon: "\u{1F7E3}"
  },
  razzberry: {
    id: "razzberry",
    name: "Razz Berry",
    category: "BERRY",
    catchBonus: 1.25,
    description: "Feed this to a wild Pok\xE9mon to make it calmer and easier to catch on your next throw.",
    count: 5,
    icon: "\u{1F353}"
  },
  goldenrazz: {
    id: "goldenrazz",
    name: "Golden Razz Berry",
    category: "BERRY",
    catchBonus: 2.5,
    description: "A miraculous berry that drastically calms wild Pok\xE9mon and boosts catch chances.",
    count: 1,
    icon: "\u2728"
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

// src/core/typing-engine.ts
var TypingEngine = class {
  stats;
  callbacks;
  idleTimer = null;
  idleThresholdMs = 3e3;
  // Reset combo if idle for 3s
  keystrokeWindow = [];
  // Timestamps for WPM calculation
  encounterThreshold = 50;
  // Base keystrokes needed for an encounter
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.stats = {
      keystrokes: 0,
      charactersTyped: 0,
      wordsTyped: 0,
      linesModified: 0,
      currentStreak: 0,
      maxStreak: 0,
      wpm: 0,
      multiplier: 1,
      encounterMeter: 0,
      lastKeystrokeTime: Date.now()
    };
  }
  getStats() {
    return { ...this.stats };
  }
  /**
   * Process a typing event from editor changes
   */
  recordKeystrokes(charCount, lineChanges = 0) {
    const now = Date.now();
    this.stats.keystrokes += 1;
    this.stats.charactersTyped += Math.max(1, charCount);
    this.stats.linesModified += Math.max(0, lineChanges);
    this.keystrokeWindow.push(now);
    const tenSecondsAgo = now - 1e4;
    while (this.keystrokeWindow.length > 0 && this.keystrokeWindow[0] < tenSecondsAgo) {
      this.keystrokeWindow.shift();
    }
    const wordsInWindow = this.keystrokeWindow.length / 5;
    this.stats.wpm = Math.round(wordsInWindow / 10 * 60);
    this.stats.currentStreak += 1;
    if (this.stats.currentStreak > this.stats.maxStreak) {
      this.stats.maxStreak = this.stats.currentStreak;
    }
    this.stats.multiplier = this.calculateMultiplier(this.stats.currentStreak);
    const xpGained = Math.round(1 * this.stats.multiplier);
    this.callbacks.onBuddyXpGain(xpGained);
    if (this.stats.keystrokes % 30 === 0) {
      this.callbacks.onItemEarned("pokeball", 1);
    }
    if (this.stats.keystrokes % 120 === 0) {
      this.callbacks.onItemEarned("greatball", 1);
    }
    if (this.stats.keystrokes % 350 === 0) {
      this.callbacks.onItemEarned("ultraball", 1);
    }
    if (this.stats.keystrokes % 200 === 0) {
      this.callbacks.onItemEarned("razzberry", 1);
    }
    const meterIncrement = 100 / this.encounterThreshold * this.stats.multiplier;
    this.stats.encounterMeter = Math.min(100, this.stats.encounterMeter + meterIncrement);
    if (this.stats.encounterMeter >= 100) {
      this.stats.encounterMeter = 0;
      this.callbacks.onEncounterReady();
    }
    this.stats.lastKeystrokeTime = now;
    this.resetIdleTimer();
    this.callbacks.onStatsUpdate(this.stats);
  }
  calculateMultiplier(streak) {
    if (streak >= 250) return 4;
    if (streak >= 150) return 3;
    if (streak >= 75) return 2.2;
    if (streak >= 35) return 1.6;
    if (streak >= 15) return 1.25;
    return 1;
  }
  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.stats.currentStreak = 0;
      this.stats.multiplier = 1;
      this.stats.wpm = 0;
      this.callbacks.onStatsUpdate(this.stats);
    }, this.idleThresholdMs);
  }
  setEncounterThreshold(keystrokes) {
    this.encounterThreshold = Math.max(10, keystrokes);
  }
  forceEncounter() {
    this.stats.encounterMeter = 0;
    this.callbacks.onEncounterReady();
    this.callbacks.onStatsUpdate(this.stats);
  }
  dispose() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
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
      logs: [`A wild ${species.name}${isShiny ? " \u2728 (SHINY!)" : ""} appeared!`],
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

// src/core/game-engine.ts
var GameEngine = class {
  saveManager;
  trainer;
  settings;
  typingEngine;
  spawnEngine;
  evolutionEngine;
  activeEncounter = null;
  activeBerryMultiplier = 1;
  events;
  constructor(events, customSavePath) {
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
  getTrainer() {
    return this.trainer;
  }
  getSettings() {
    return this.settings;
  }
  getTypingStats() {
    return this.typingEngine.getStats();
  }
  getActiveEncounter() {
    return this.activeEncounter;
  }
  getBuddy() {
    if (!this.trainer.activeBuddyId) return null;
    return this.trainer.party.find((p) => p.instanceId === this.trainer.activeBuddyId) || this.trainer.party[0] || null;
  }
  /**
   * Main entry point when user types code in VS Code
   */
  onTextTyped(charCount, lineChanges = 0) {
    this.trainer.totalKeystrokes += 1;
    this.trainer.totalLinesCoded += Math.max(0, lineChanges);
    this.typingEngine.recordKeystrokes(charCount, lineChanges);
    this.saveManager.scheduleSave(this.trainer, this.settings);
  }
  /**
   * Wild encounter trigger
   */
  triggerEncounter() {
    if (this.activeEncounter && this.activeEncounter.status === "ACTIVE") {
      return;
    }
    const streak = this.typingEngine.getStats().currentStreak;
    this.activeEncounter = this.spawnEngine.generateEncounter(this.trainer, streak);
    this.activeBerryMultiplier = 1;
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
    if (this.settings.autoThrowPokeball && (this.trainer.inventory["pokeball"] || 0) > 0) {
      setTimeout(() => {
        if (this.activeEncounter && this.activeEncounter.status === "ACTIVE") {
          this.throwBall("pokeball");
        }
      }, 500);
    }
  }
  /**
   * Throw a Pokéball at the wild Pokémon
   */
  throwBall(ballId = "pokeball") {
    if (!this.activeEncounter || this.activeEncounter.status !== "ACTIVE") {
      return { success: false, message: "No wild Pok\xE9mon to catch right now!" };
    }
    const currentCount = this.trainer.inventory[ballId] || 0;
    if (currentCount <= 0) {
      return { success: false, message: `You have no ${ITEMS_DATABASE[ballId]?.name || ballId}s left!` };
    }
    this.trainer.inventory[ballId] = currentCount - 1;
    const ballItem = ITEMS_DATABASE[ballId];
    const ballMultiplier = ballItem?.catchBonus || 1;
    const result = this.spawnEngine.attemptCatch(
      this.activeEncounter,
      ballMultiplier,
      this.activeBerryMultiplier
    );
    this.activeBerryMultiplier = 1;
    if (result.success) {
      this.activeEncounter.status = "CAUGHT";
      const caughtPokemon = this.activeEncounter.pokemon;
      if (this.trainer.party.length < 6) {
        this.trainer.party.push(caughtPokemon);
      } else {
        this.trainer.box.push(caughtPokemon);
      }
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
      this.trainer.totalXp += this.activeEncounter.species.baseXpYield;
      this.checkTrainerLevel();
      this.events.onCatchSuccess(caughtPokemon, isNewEntry);
      this.saveManager.saveNow(this.trainer, this.settings);
    } else if (result.escaped) {
      this.activeEncounter.status = "FLED";
    }
    this.activeEncounter.logs.push(result.message);
    this.broadcastState();
    return { success: result.success, message: result.message };
  }
  /**
   * Feed a berry to wild Pokémon
   */
  feedBerry(berryId) {
    if (!this.activeEncounter || this.activeEncounter.status !== "ACTIVE") {
      return { success: false, message: "No active encounter!" };
    }
    const count = this.trainer.inventory[berryId] || 0;
    if (count <= 0) {
      return { success: false, message: "No berries left!" };
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
  flee() {
    if (this.activeEncounter) {
      this.activeEncounter.status = "FLED";
      this.broadcastState();
    }
  }
  /**
   * Change active buddy Pokémon
   */
  setBuddy(instanceId) {
    const found = this.trainer.party.find((p) => p.instanceId === instanceId);
    if (found) {
      this.trainer.activeBuddyId = instanceId;
      this.saveManager.saveNow(this.trainer, this.settings);
      this.broadcastState();
      return true;
    }
    return false;
  }
  grantBuddyXp(amount) {
    const buddy = this.getBuddy();
    if (!buddy) return;
    const result = this.evolutionEngine.addXp(buddy, amount);
    if (result.leveledUp) {
      this.events.onLevelUp(buddy, result);
      this.saveManager.scheduleSave(this.trainer, this.settings);
    }
  }
  awardItem(itemId, count) {
    const current = this.trainer.inventory[itemId] || 0;
    this.trainer.inventory[itemId] = current + count;
    const itemName = ITEMS_DATABASE[itemId]?.name || itemId;
    this.events.onItemDrop(itemName, count);
  }
  checkTrainerLevel() {
    const needed = this.trainer.level * 250;
    if (this.trainer.totalXp >= needed) {
      this.trainer.level += 1;
      this.events.onNotification(`Trainer Level Up! You are now Level ${this.trainer.level}!`, "success");
      this.awardItem("ultraball", 2);
      this.awardItem("goldenrazz", 1);
    }
  }
  getFullState() {
    return {
      trainer: this.trainer,
      settings: this.settings,
      typingStats: this.typingEngine.getStats(),
      activeEncounter: this.activeEncounter,
      buddy: this.getBuddy(),
      inventoryItems: Object.values(ITEMS_DATABASE).map((item) => ({
        ...item,
        count: this.trainer.inventory[item.id] || 0
      }))
    };
  }
  broadcastState() {
    this.events.onStateUpdate(this.getFullState());
  }
  forceSpawn() {
    this.typingEngine.forceEncounter();
  }
  dispose() {
    this.typingEngine.dispose();
    this.saveManager.dispose();
    this.saveManager.saveNow(this.trainer, this.settings);
  }
};

// src/ui/status-bar.ts
var vscode = __toESM(require("vscode"));
var PokeStatusBar = class {
  statusBarItem;
  gameEngine;
  constructor(gameEngine2) {
    this.gameEngine = gameEngine2;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "vs-pokecode.openPanel";
    this.statusBarItem.show();
    this.update();
  }
  update() {
    const buddy = this.gameEngine.getBuddy();
    const encounter = this.gameEngine.getActiveEncounter();
    const stats = this.gameEngine.getTypingStats();
    if (encounter && encounter.status === "ACTIVE") {
      this.statusBarItem.text = `$(zap) Wild ${encounter.species.name} appeared! Catch it!`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
      this.statusBarItem.tooltip = `Click to battle & catch ${encounter.species.name}!`;
      return;
    }
    this.statusBarItem.backgroundColor = void 0;
    const buddyName = buddy ? `${buddy.nickname} Lv.${buddy.level}` : "No Buddy";
    const streakText = stats.currentStreak > 5 ? `\u{1F525} ${stats.currentStreak}x` : "";
    const meterPct = Math.round(stats.encounterMeter);
    this.statusBarItem.text = `$(hubot) ${buddyName} ${streakText ? `| ${streakText} ` : ""}| \u{1F43E} ${meterPct}%`;
    this.statusBarItem.tooltip = [
      `VS POKECODE Status`,
      `Buddy: ${buddy?.name || "None"} (Level ${buddy?.level || 0})`,
      `Streak: ${stats.currentStreak} (Multiplier: ${stats.multiplier.toFixed(1)}x)`,
      `Typing Speed: ${stats.wpm} WPM`,
      `Wild Encounter Meter: ${meterPct}%`,
      `Click to open Pok\xE9mon Trainer Panel`
    ].join("\n");
  }
  dispose() {
    this.statusBarItem.dispose();
  }
};

// src/ui/webview-provider.ts
var vscode2 = __toESM(require("vscode"));
var PokeWebviewProvider = class {
  constructor(extensionUri, gameEngine2) {
    this.extensionUri = extensionUri;
    this.gameEngine = gameEngine2;
  }
  static viewType = "pokecode.mainView";
  _view;
  resolveWebviewView(webviewView, _context, _token) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.type) {
        case "REQUEST_STATE":
          this.postMessage("INIT_STATE", this.gameEngine.getFullState());
          break;
        case "THROW_BALL":
          const ballId = message.payload?.ballId || "pokeball";
          const catchResult = this.gameEngine.throwBall(ballId);
          if (!catchResult.success) {
            vscode2.window.showInformationMessage(catchResult.message);
          }
          break;
        case "FEED_BERRY":
          const berryId = message.payload?.berryId || "razzberry";
          this.gameEngine.feedBerry(berryId);
          break;
        case "FLEE":
          this.gameEngine.flee();
          break;
        case "SET_BUDDY":
          if (message.payload?.instanceId) {
            this.gameEngine.setBuddy(message.payload.instanceId);
          }
          break;
        case "DEBUG_SPAWN":
          this.gameEngine.forceSpawn();
          break;
      }
    });
    setTimeout(() => {
      this.postMessage("INIT_STATE", this.gameEngine.getFullState());
    }, 200);
  }
  postMessage(type, payload) {
    if (this._view) {
      this._view.webview.postMessage({ type, payload });
    }
  }
  getHtmlForWebview(webview) {
    const scriptUri = webview.asWebviewUri(
      vscode2.Uri.joinPath(this.extensionUri, "media", "main.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode2.Uri.joinPath(this.extensionUri, "media", "styles.css")
    );
    const nonce = getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: ${webview.cspSource}; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; media-src https: data: blob:;">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VS POKECODE</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="app">
    <!-- Top Trainer HUD -->
    <header class="trainer-hud">
      <div class="trainer-header-row">
        <div class="trainer-title">
          <span class="trainer-badge">\u26A1</span>
          <span id="trainer-name" class="pixel-text">Ash Koder</span>
        </div>
        <div class="trainer-level-tag">Lv. <span id="trainer-level">1</span></div>
      </div>
      <div class="trainer-stats-row">
        <div class="stat-pill"><span class="icon">\u2328\uFE0F</span> <span id="stat-keystrokes">0</span> keys</div>
        <div class="stat-pill"><span class="icon">\u26A1</span> <span id="stat-wpm">0</span> WPM</div>
        <div class="stat-pill streak-pill"><span class="icon">\u{1F525}</span> <span id="stat-streak">0</span>x</div>
      </div>

      <!-- Encounter Meter Bar -->
      <div class="meter-container">
        <div class="meter-label-row">
          <span>WILD ENCOUNTER METER</span>
          <span id="meter-percent">0%</span>
        </div>
        <div class="meter-bar-track">
          <div id="meter-bar-fill" class="meter-bar-fill" style="width: 0%"></div>
        </div>
      </div>
    </header>

    <!-- Navigation Tabs -->
    <nav class="hud-tabs">
      <button class="tab-btn active" data-tab="battle">\u2694\uFE0F FIELD</button>
      <button class="tab-btn" data-tab="buddy">\u{1F43E} BUDDY</button>
      <button class="tab-btn" data-tab="party">\u{1F392} PARTY</button>
      <button class="tab-btn" data-tab="pokedex">\u{1F4D6} DEX</button>
    </nav>

    <!-- TAB 1: FIELD / BATTLE ENCOUNTER -->
    <main id="tab-battle" class="tab-content active">
      <!-- Active Wild Encounter Arena -->
      <div id="encounter-card" class="arena-card hidden">
        <div class="arena-banner">
          <span class="wild-tag">WILD POK\xC9MON!</span>
          <span id="wild-rarity" class="rarity-badge common">COMMON</span>
        </div>
        <div class="wild-sprite-wrapper">
          <div id="wild-sparkles" class="sparkles hidden">\u2728</div>
          <img id="wild-sprite" class="pokemon-sprite floating" src="" alt="Wild Pok\xE9mon" />
          <div class="shadow-disc"></div>
        </div>
        <div class="wild-info-row">
          <h2 id="wild-name" class="pixel-heading">Pikachu</h2>
          <span class="wild-level">Lv. <span id="wild-level">5</span></span>
        </div>
        <div id="wild-types" class="types-row"></div>
        <div class="catch-gauge-wrapper">
          <div class="catch-chance-label">Catch Chance: <span id="catch-chance-val">50%</span></div>
          <div id="encounter-log" class="encounter-log-box">A wild Pok\xE9mon appeared!</div>
        </div>

        <!-- Encounter Actions -->
        <div class="action-grid">
          <button id="btn-pokeball" class="action-btn ball-btn" data-ball="pokeball">
            <span class="btn-icon">\u{1F534}</span>
            <span class="btn-label">Pok\xE9 Ball (<span id="count-pokeball">0</span>)</span>
          </button>
          <button id="btn-greatball" class="action-btn ball-btn" data-ball="greatball">
            <span class="btn-icon">\u{1F535}</span>
            <span class="btn-label">Great Ball (<span id="count-greatball">0</span>)</span>
          </button>
          <button id="btn-ultraball" class="action-btn ball-btn" data-ball="ultraball">
            <span class="btn-icon">\u{1F7E1}</span>
            <span class="btn-label">Ultra Ball (<span id="count-ultraball">0</span>)</span>
          </button>
          <button id="btn-razz" class="action-btn berry-btn" data-berry="razzberry">
            <span class="btn-icon">\u{1F353}</span>
            <span class="btn-label">Razz Berry (<span id="count-razzberry">0</span>)</span>
          </button>
          <button id="btn-flee" class="action-btn flee-btn">
            <span class="btn-icon">\u{1F3C3}</span>
            <span class="btn-label">Run Away</span>
          </button>
        </div>
      </div>

      <!-- Peaceful Field Screen (When no encounter active) -->
      <div id="idle-field" class="idle-field">
        <div class="field-sky">
          <div class="ambient-cloud cloud-1">\u2601\uFE0F</div>
          <div class="ambient-cloud cloud-2">\u2601\uFE0F</div>
        </div>
        <div class="buddy-showcase">
          <div class="buddy-header">
            <span class="label">ACTIVE COMPANION</span>
            <span id="idle-buddy-level" class="level-tag">Lv. 5</span>
          </div>
          <div class="sprite-stage">
            <img id="idle-buddy-sprite" class="buddy-sprite walking" src="" alt="Buddy Pok\xE9mon" />
            <div class="shadow-disc"></div>
          </div>
          <div id="idle-buddy-name" class="buddy-name-text">Pikachu</div>
          
          <!-- Buddy XP Bar -->
          <div class="xp-bar-box">
            <div class="xp-label-row">
              <span>EXP TO NEXT LEVEL</span>
              <span id="buddy-xp-text">0 / 100</span>
            </div>
            <div class="xp-track">
              <div id="buddy-xp-bar" class="xp-fill" style="width: 0%"></div>
            </div>
          </div>
        </div>

        <div class="typing-callout">
          <p class="instruction-text">Type code in any editor to earn EXP, find Pok\xE9 Balls, and discover wild Pok\xE9mon!</p>
          <button id="btn-spawn-test" class="secondary-btn">\u26A1 Summon Wild Pok\xE9mon (Test)</button>
        </div>
      </div>
    </main>

    <!-- TAB 2: BUDDY DETAILS -->
    <section id="tab-buddy" class="tab-content">
      <div class="card buddy-card-full">
        <div class="buddy-spotlight">
          <img id="detail-buddy-sprite" class="showcase-sprite" src="" alt="Buddy" />
          <h3 id="detail-buddy-name">Pikachu</h3>
          <div id="detail-buddy-types" class="types-row"></div>
        </div>
        <div class="stats-table">
          <div class="stat-row"><span>HP</span><span id="detail-hp">35</span></div>
          <div class="stat-row"><span>Attack</span><span id="detail-attack">55</span></div>
          <div class="stat-row"><span>Defense</span><span id="detail-defense">40</span></div>
          <div class="stat-row"><span>Speed</span><span id="detail-speed">90</span></div>
        </div>
        <div class="inventory-summary">
          <h4>Your Pok\xE9Bag</h4>
          <div id="inventory-grid" class="inventory-grid"></div>
        </div>
      </div>
    </section>

    <!-- TAB 3: PARTY LIST -->
    <section id="tab-party" class="tab-content">
      <div class="tab-header-text">Your Pok\xE9mon Team (Max 6)</div>
      <div id="party-list" class="pokemon-grid"></div>
    </section>

    <!-- TAB 4: POK\xC9DEX -->
    <section id="tab-pokedex" class="tab-content">
      <div class="dex-header-row">
        <span>POK\xC9DEX ENTRIES</span>
        <span id="dex-count">0 / 151</span>
      </div>
      <div id="pokedex-grid" class="pokedex-grid"></div>
    </section>

    <!-- Notification Toast -->
    <div id="toast" class="toast hidden"></div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
};
function getNonce() {
  let text = "";
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

// src/extension.ts
var gameEngine;
var statusBar;
var webviewProvider;
function activate(context) {
  console.log("VS POKECODE is activating!");
  gameEngine = new GameEngine({
    onStateUpdate: (state) => {
      statusBar.update();
      webviewProvider.postMessage("STATE_UPDATE", state);
    },
    onEncounterSpawned: (encounter) => {
      statusBar.update();
      webviewProvider.postMessage("ENCOUNTER_SPAWN", encounter);
      const shinyTag = encounter.pokemon.isShiny ? " \u2728 SHINY" : "";
      vscode3.window.showInformationMessage(
        `\u26A1 A wild ${encounter.species.name}${shinyTag} (Lv.${encounter.pokemon.level}) appeared!`,
        "Throw Pok\xE9 Ball",
        "Open Field"
      ).then((selection) => {
        if (selection === "Throw Pok\xE9 Ball") {
          const res = gameEngine.throwBall("pokeball");
          vscode3.window.showInformationMessage(res.message);
        } else if (selection === "Open Field") {
          vscode3.commands.executeCommand("pokecode.mainView.focus");
        }
      });
    },
    onCatchSuccess: (pokemon, isNewPokedex) => {
      statusBar.update();
      webviewProvider.postMessage("CATCH_SUCCESS", pokemon);
      const shinyStr = pokemon.isShiny ? " \u2728 Shiny" : "";
      const dexStr = isNewPokedex ? " Registered to Pok\xE9dex!" : "";
      vscode3.window.showInformationMessage(
        `\u{1F389} Gotcha! ${pokemon.nickname}${shinyStr} was caught!${dexStr}`
      );
    },
    onLevelUp: (pokemon, result) => {
      statusBar.update();
      if (result.evolved && result.newSpecies) {
        webviewProvider.postMessage("EVOLVE", { pokemon, result });
        vscode3.window.showInformationMessage(
          `\u{1F31F} What? ${result.oldSpecies?.name || pokemon.nickname} is evolving... Congratulations! Your Pok\xE9mon evolved into ${result.newSpecies.name}!`
        );
      } else {
        webviewProvider.postMessage("LEVEL_UP", pokemon);
      }
    },
    onItemDrop: (itemName, count) => {
      vscode3.window.setStatusBarMessage(`\u{1F392} Found ${count}x ${itemName}!`, 2500);
    },
    onNotification: (msg, type) => {
      if (type === "warning") {
        vscode3.window.showWarningMessage(msg);
      } else {
        vscode3.window.showInformationMessage(msg);
      }
    }
  });
  webviewProvider = new PokeWebviewProvider(context.extensionUri, gameEngine);
  context.subscriptions.push(
    vscode3.window.registerWebviewViewProvider(
      PokeWebviewProvider.viewType,
      webviewProvider
    )
  );
  statusBar = new PokeStatusBar(gameEngine);
  context.subscriptions.push(statusBar);
  context.subscriptions.push(
    vscode3.workspace.onDidChangeTextDocument((event) => {
      if (event.document.uri.scheme !== "file" && event.document.uri.scheme !== "untitled") {
        return;
      }
      let totalChars = 0;
      let lineChanges = 0;
      for (const change of event.contentChanges) {
        totalChars += change.text.length;
        if (change.text.includes("\n")) {
          lineChanges += change.text.split("\n").length - 1;
        }
      }
      if (totalChars > 0 || event.contentChanges.length > 0) {
        gameEngine.onTextTyped(totalChars || 1, lineChanges);
      }
    })
  );
  context.subscriptions.push(
    vscode3.workspace.onDidSaveTextDocument(() => {
      gameEngine.onTextTyped(10, 1);
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.openPanel", () => {
      vscode3.commands.executeCommand("pokecode.mainView.focus");
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.spawnWild", () => {
      gameEngine.forceSpawn();
      vscode3.window.showInformationMessage("\u26A1 Summoned a wild Pok\xE9mon encounter!");
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.catchPokemon", () => {
      const res = gameEngine.throwBall("pokeball");
      vscode3.window.showInformationMessage(res.message);
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.showStats", () => {
      const stats = gameEngine.getTypingStats();
      const trainer = gameEngine.getTrainer();
      const buddy = gameEngine.getBuddy();
      vscode3.window.showInformationMessage(
        `\u{1F3C6} ${trainer.name} (Lv.${trainer.level}) | Buddy: ${buddy?.name || "None"} (Lv.${buddy?.level || 0}) | Keys: ${stats.keystrokes} | WPM: ${stats.wpm} | Max Streak: ${stats.maxStreak}x`
      );
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.setBuddy", async () => {
      const trainer = gameEngine.getTrainer();
      const items = trainer.party.map((p) => ({
        label: `${p.nickname} (Lv. ${p.level})`,
        description: p.types.join("/"),
        instanceId: p.instanceId
      }));
      const selection = await vscode3.window.showQuickPick(items, {
        placeHolder: "Select your active companion Pok\xE9mon"
      });
      if (selection) {
        gameEngine.setBuddy(selection.instanceId);
        vscode3.window.showInformationMessage(`Active companion set to ${selection.label}!`);
      }
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.exportSave", async () => {
      const targetUri = await vscode3.window.showSaveDialog({
        defaultUri: vscode3.Uri.file("pokecode-trainer-backup.json"),
        filters: { "JSON Files": ["json"] }
      });
      if (targetUri) {
        gameEngine["saveManager"].getFileSystem().exportData(
          targetUri.fsPath,
          gameEngine.getFullState()
        );
        vscode3.window.showInformationMessage(`Trainer save successfully exported!`);
      }
    })
  );
  context.subscriptions.push(
    vscode3.commands.registerCommand("vs-pokecode.resetGame", async () => {
      const confirm = await vscode3.window.showWarningMessage(
        "Are you sure you want to restart your trainer journey? This will reset all caught Pok\xE9mon and progress.",
        { modal: true },
        "Reset Journey"
      );
      if (confirm === "Reset Journey") {
        gameEngine["saveManager"].createNewTrainer();
        vscode3.commands.executeCommand("workbench.action.reloadWindow");
      }
    })
  );
}
function deactivate() {
  if (gameEngine) {
    gameEngine.dispose();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
