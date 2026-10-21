import * as vscode from 'vscode';
import { GameEngine } from './core/game-engine';
import { PokeStatusBar } from './ui/status-bar';
import { PokeWebviewProvider } from './ui/webview-provider';
import { ActiveEncounter, PokemonInstance } from './types';
import { LevelUpResult } from './core/evolution-engine';

let gameEngine: GameEngine;
let statusBar: PokeStatusBar;
let webviewProvider: PokeWebviewProvider;

export function activate(context: vscode.ExtensionContext) {
  console.log('VS POKECODE is activating!');

  // Initialize Game Engine with event hooks
  gameEngine = new GameEngine({
    onStateUpdate: (state) => {
      statusBar.update();
      webviewProvider.postMessage('STATE_UPDATE', state);
    },
    onEncounterSpawned: (encounter: ActiveEncounter) => {
      statusBar.update();
      webviewProvider.postMessage('ENCOUNTER_SPAWN', encounter);

      const shinyTag = encounter.pokemon.isShiny ? ' [SHINY]' : '';
      vscode.window.showInformationMessage(
        `A wild ${encounter.species.name}${shinyTag} (Lv.${encounter.pokemon.level}) appeared!`,
        'Throw Poke Ball',
        'Open Field'
      ).then(selection => {
        if (selection === 'Throw Poke Ball') {
          const res = gameEngine.throwBall('pokeball');
          vscode.window.showInformationMessage(res.message);
        } else if (selection === 'Open Field') {
          vscode.commands.executeCommand('pokecode.mainView.focus');
        }
      });
    },
    onCatchSuccess: (pokemon: PokemonInstance, isNewPokedex: boolean) => {
      statusBar.update();
      webviewProvider.postMessage('CATCH_SUCCESS', pokemon);
      const shinyStr = pokemon.isShiny ? ' [Shiny]' : '';
      const dexStr = isNewPokedex ? ' Registered to Pokedex!' : '';
      vscode.window.showInformationMessage(
        `Gotcha! ${pokemon.nickname}${shinyStr} was caught!${dexStr}`
      );
    },
    onLevelUp: (pokemon: PokemonInstance, result: LevelUpResult) => {
      statusBar.update();
      if (result.evolved && result.newSpecies) {
        webviewProvider.postMessage('EVOLVE', { pokemon, result });
        vscode.window.showInformationMessage(
          `What? ${result.oldSpecies?.name || pokemon.nickname} is evolving... Congratulations! Your Pokemon evolved into ${result.newSpecies.name}!`
        );
      } else {
        webviewProvider.postMessage('LEVEL_UP', pokemon);
      }
    },
    onItemDrop: (itemName: string, count: number) => {
      // Optional subtle notification on item drops
      vscode.window.setStatusBarMessage(`Found ${count}x ${itemName}!`, 2500);
    },
    onNotification: (msg: string, type: 'info' | 'warning' | 'success') => {
      if (type === 'warning') {
        vscode.window.showWarningMessage(msg);
      } else {
        vscode.window.showInformationMessage(msg);
      }
    }
  });

  // Initialize Webview Provider
  webviewProvider = new PokeWebviewProvider(context.extensionUri, gameEngine);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PokeWebviewProvider.viewType,
      webviewProvider
    )
  );

  // Initialize Status Bar
  statusBar = new PokeStatusBar(gameEngine);
  context.subscriptions.push(statusBar);

  // Register Typing Listener (Keystroke & Line Activity)
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) => {
      // Ignore output panels or git lenses
      if (event.document.uri.scheme !== 'file' && event.document.uri.scheme !== 'untitled') {
        return;
      }

      let totalChars = 0;
      let lineChanges = 0;

      for (const change of event.contentChanges) {
        totalChars += change.text.length;
        if (change.text.includes('\n')) {
          lineChanges += change.text.split('\n').length - 1;
        }
      }

      if (totalChars > 0 || event.contentChanges.length > 0) {
        gameEngine.onTextTyped(totalChars || 1, lineChanges);
      }
    })
  );

  // Register Document Save Listener
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(() => {
      // Give a little bonus progress when saving files!
      gameEngine.onTextTyped(10, 1);
    })
  );

  // Commands Registration
  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.openPanel', () => {
      vscode.commands.executeCommand('pokecode.mainView.focus');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.spawnWild', () => {
      gameEngine.forceSpawn();
      vscode.window.showInformationMessage('Summoned a wild Pokemon encounter!');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.catchPokemon', () => {
      const res = gameEngine.throwBall('pokeball');
      vscode.window.showInformationMessage(res.message);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.showStats', () => {
      const stats = gameEngine.getTypingStats();
      const trainer = gameEngine.getTrainer();
      const buddy = gameEngine.getBuddy();

      vscode.window.showInformationMessage(
        `${trainer.name} (Lv.${trainer.level}) | Buddy: ${buddy?.name || 'None'} (Lv.${buddy?.level || 0}) | Keys: ${stats.keystrokes} | WPM: ${stats.wpm} | Max Streak: ${stats.maxStreak}x`
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.setBuddy', async () => {
      const trainer = gameEngine.getTrainer();
      const items = trainer.party.map(p => ({
        label: `${p.nickname} (Lv. ${p.level})`,
        description: p.types.join('/'),
        instanceId: p.instanceId
      }));

      const selection = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select your active companion Pokémon'
      });

      if (selection) {
        gameEngine.setBuddy(selection.instanceId);
        vscode.window.showInformationMessage(`Active companion set to ${selection.label}!`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.exportSave', async () => {
      const targetUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file('pokecode-trainer-backup.json'),
        filters: { 'JSON Files': ['json'] }
      });
      if (targetUri) {
        gameEngine['saveManager'].getFileSystem().exportData(
          targetUri.fsPath,
          gameEngine.getFullState()
        );
        vscode.window.showInformationMessage(`Trainer save successfully exported!`);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('vs-pokecode.resetGame', async () => {
      const confirm = await vscode.window.showWarningMessage(
        'Are you sure you want to restart your trainer journey? This will reset all caught Pokémon and progress.',
        { modal: true },
        'Reset Journey'
      );
      if (confirm === 'Reset Journey') {
        gameEngine['saveManager'].createNewTrainer();
        vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    })
  );
}

export function deactivate() {
  if (gameEngine) {
    gameEngine.dispose();
  }
}
