import * as vscode from 'vscode';
import { GameEngine } from '../core/game-engine';

export class PokeStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private gameEngine: GameEngine;

  constructor(gameEngine: GameEngine) {
    this.gameEngine = gameEngine;
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'vs-pokecode.openPanel';
    this.statusBarItem.show();
    this.update();
  }

  public update(): void {
    const buddy = this.gameEngine.getBuddy();
    const encounter = this.gameEngine.getActiveEncounter();
    const stats = this.gameEngine.getTypingStats();

    if (encounter && encounter.status === 'ACTIVE') {
      this.statusBarItem.text = `$(zap) Wild ${encounter.species.name} appeared! Catch it!`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
      this.statusBarItem.tooltip = `Click to battle & catch ${encounter.species.name}!`;
      return;
    }

    this.statusBarItem.backgroundColor = undefined;
    const buddyName = buddy ? `${buddy.nickname} Lv.${buddy.level}` : 'No Buddy';
    const streakText = stats.currentStreak > 5 ? `Streak: ${stats.currentStreak}x` : '';
    const meterPct = Math.round(stats.encounterMeter);

    this.statusBarItem.text = `$(hubot) ${buddyName} ${streakText ? `| ${streakText} ` : ''}| Encounter: ${meterPct}%`;
    this.statusBarItem.tooltip = [
      `VS POKECODE Status`,
      `Buddy: ${buddy?.name || 'None'} (Level ${buddy?.level || 0})`,
      `Streak: ${stats.currentStreak} (Multiplier: ${stats.multiplier.toFixed(1)}x)`,
      `Typing Speed: ${stats.wpm} WPM`,
      `Wild Encounter Meter: ${meterPct}%`,
      `Click to open Pokemon Trainer Panel`
    ].join('\n');
  }

  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
