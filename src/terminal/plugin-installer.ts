import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class PluginInstaller {
  private pokeDir: string;
  private pluginFile: string;
  private bashrcFile: string;

  constructor() {
    this.pokeDir = path.join(os.homedir(), '.pokecode');
    this.pluginFile = path.join(this.pokeDir, 'pokecode.plugin.bash');
    this.bashrcFile = path.join(os.homedir(), '.bashrc');
    if (!fs.existsSync(this.pokeDir)) {
      fs.mkdirSync(this.pokeDir, { recursive: true });
    }
  }

  public generatePluginScript(): void {
    const scriptContent = `# VS POKECODE Shell Plugin
# Spawns wild Pokémon directly in your terminal every 8 words typed!

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
    fs.writeFileSync(this.pluginFile, scriptContent, 'utf-8');
  }

  public installToBashrc(): boolean {
    this.generatePluginScript();

    if (!fs.existsSync(this.bashrcFile)) {
      return false;
    }

    const bashrc = fs.readFileSync(this.bashrcFile, 'utf-8');
    const sourceLine = `\n# VS POKECODE Terminal Plugin (spawns wild Pokémon every 8 words)\n[ -f "$HOME/.pokecode/pokecode.plugin.bash" ] && source "$HOME/.pokecode/pokecode.plugin.bash"\n`;

    if (!bashrc.includes('pokecode.plugin.bash')) {
      fs.appendFileSync(this.bashrcFile, sourceLine, 'utf-8');
      return true;
    }
    return false;
  }

  public uninstallFromBashrc(): void {
    if (!fs.existsSync(this.bashrcFile)) return;
    let bashrc = fs.readFileSync(this.bashrcFile, 'utf-8');
    bashrc = bashrc.replace(/\n# VS POKECODE Terminal Plugin[\s\S]*?pokecode\.plugin\.bash"/g, '');
    fs.writeFileSync(this.bashrcFile, bashrc, 'utf-8');
  }
}
