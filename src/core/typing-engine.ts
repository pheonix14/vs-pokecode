import { TypingStats } from '../types';

export interface TypingEngineCallbacks {
  onEncounterReady: () => void;
  onBuddyXpGain: (amount: number) => void;
  onItemEarned: (itemId: string, amount: number) => void;
  onStatsUpdate: (stats: TypingStats) => void;
}

export class TypingEngine {
  private stats: TypingStats;
  private callbacks: TypingEngineCallbacks;
  private idleTimer: NodeJS.Timeout | null = null;
  private readonly idleThresholdMs = 3000; // Reset combo if idle for 3s
  private keystrokeWindow: number[] = []; // Timestamps for WPM calculation
  private encounterThreshold = 50; // Base keystrokes needed for an encounter

  constructor(callbacks: TypingEngineCallbacks) {
    this.callbacks = callbacks;
    this.stats = {
      keystrokes: 0,
      charactersTyped: 0,
      wordsTyped: 0,
      linesModified: 0,
      currentStreak: 0,
      maxStreak: 0,
      wpm: 0,
      multiplier: 1.0,
      encounterMeter: 0,
      lastKeystrokeTime: Date.now()
    };
  }

  public getStats(): TypingStats {
    return { ...this.stats };
  }

  /**
   * Process a typing event from editor changes
   */
  public recordKeystrokes(charCount: number, lineChanges: number = 0): void {
    const now = Date.now();
    this.stats.keystrokes += 1;
    this.stats.charactersTyped += Math.max(1, charCount);
    this.stats.linesModified += Math.max(0, lineChanges);

    // Track rolling keystroke window for WPM (last 10 seconds)
    this.keystrokeWindow.push(now);
    const tenSecondsAgo = now - 10000;
    while (this.keystrokeWindow.length > 0 && this.keystrokeWindow[0] < tenSecondsAgo) {
      this.keystrokeWindow.shift();
    }

    // Calculate approximate WPM (5 chars = 1 word standard)
    const wordsInWindow = (this.keystrokeWindow.length / 5);
    this.stats.wpm = Math.round((wordsInWindow / 10) * 60);

    // Streak and Multiplier calculation
    this.stats.currentStreak += 1;
    if (this.stats.currentStreak > this.stats.maxStreak) {
      this.stats.maxStreak = this.stats.currentStreak;
    }
    this.stats.multiplier = this.calculateMultiplier(this.stats.currentStreak);

    // Calculate Buddy XP gain (scaled by multiplier)
    const xpGained = Math.round(1 * this.stats.multiplier);
    this.callbacks.onBuddyXpGain(xpGained);

    // Passive Item Drops for Coding Milestones
    if (this.stats.keystrokes % 30 === 0) {
      this.callbacks.onItemEarned('pokeball', 1);
    }
    if (this.stats.keystrokes % 120 === 0) {
      this.callbacks.onItemEarned('greatball', 1);
    }
    if (this.stats.keystrokes % 350 === 0) {
      this.callbacks.onItemEarned('ultraball', 1);
    }
    if (this.stats.keystrokes % 200 === 0) {
      this.callbacks.onItemEarned('razzberry', 1);
    }

    // Encounter Meter progress (scales with streak multiplier)
    const meterIncrement = (100 / this.encounterThreshold) * this.stats.multiplier;
    this.stats.encounterMeter = Math.min(100, this.stats.encounterMeter + meterIncrement);

    if (this.stats.encounterMeter >= 100) {
      this.stats.encounterMeter = 0;
      this.callbacks.onEncounterReady();
    }

    this.stats.lastKeystrokeTime = now;
    this.resetIdleTimer();
    this.callbacks.onStatsUpdate(this.stats);
  }

  private calculateMultiplier(streak: number): number {
    if (streak >= 250) return 4.0;
    if (streak >= 150) return 3.0;
    if (streak >= 75) return 2.2;
    if (streak >= 35) return 1.6;
    if (streak >= 15) return 1.25;
    return 1.0;
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    this.idleTimer = setTimeout(() => {
      this.stats.currentStreak = 0;
      this.stats.multiplier = 1.0;
      this.stats.wpm = 0;
      this.callbacks.onStatsUpdate(this.stats);
    }, this.idleThresholdMs);
  }

  public setEncounterThreshold(keystrokes: number): void {
    this.encounterThreshold = Math.max(10, keystrokes);
  }

  public forceEncounter(): void {
    this.stats.encounterMeter = 0;
    this.callbacks.onEncounterReady();
    this.callbacks.onStatsUpdate(this.stats);
  }

  public dispose(): void {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
  }
}
