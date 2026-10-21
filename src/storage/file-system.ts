import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

/**
 * PokeFileSystem - Specialized File System and Storage Engine for VS POKECODE
 *
 * Provides organized structure:
 *  ~/.pokecode/
 *   ├── trainer.json          # Main trainer profile & party
 *   ├── pokedex.json          # Discovered species & records
 *   ├── settings.json         # User settings
 *   ├── sessions/             # Session history & logs
 *   │    └── session_<date>.json
 *   └── backups/              # Rolling atomic backups
 *        └── backup_<timestamp>_<checksum>.json
 */
export class PokeFileSystem {
  private baseDir: string;
  private sessionsDir: string;
  private backupsDir: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.baseDir = customPath;
    } else {
      this.baseDir = path.join(os.homedir(), '.pokecode');
    }
    this.sessionsDir = path.join(this.baseDir, 'sessions');
    this.backupsDir = path.join(this.baseDir, 'backups');

    this.initializeDirectories();
  }

  public getBaseDir(): string {
    return this.baseDir;
  }

  private initializeDirectories(): void {
    const dirs = [this.baseDir, this.sessionsDir, this.backupsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
      }
    }
  }

  /**
   * Atomic file writing with temp file swapping to prevent corruption
   */
  public atomicWriteJson<T>(filename: string, data: T): void {
    const targetPath = path.join(this.baseDir, filename);
    const tempPath = `${targetPath}.${Date.now()}.tmp`;
    const jsonStr = JSON.stringify(data, null, 2);

    try {
      fs.writeFileSync(tempPath, jsonStr, 'utf-8');
      fs.renameSync(tempPath, targetPath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch (_) {}
      }
      throw new Error(`[PokeFS] Failed to atomic-write ${filename}: ${err}`);
    }
  }

  public readJson<T>(filename: string): T | null {
    const targetPath = path.join(this.baseDir, filename);
    if (!fs.existsSync(targetPath)) {
      return null;
    }
    try {
      const raw = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      console.error(`[PokeFS] Error reading JSON file ${filename}:`, err);
      return null;
    }
  }

  /**
   * Create an automated rotating backup with SHA-256 integrity hash
   */
  public createBackup(filename: string): string | null {
    const sourcePath = path.join(this.baseDir, filename);
    if (!fs.existsSync(sourcePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(sourcePath, 'utf-8');
      const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 8);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `backup_${path.parse(filename).name}_${timestamp}_${hash}.json`;
      const backupPath = path.join(this.backupsDir, backupFilename);

      fs.writeFileSync(backupPath, content, 'utf-8');
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
  private pruneOldBackups(maxKeep: number): void {
    try {
      const files = fs.readdirSync(this.backupsDir)
        .map(file => ({
          file,
          time: fs.statSync(path.join(this.backupsDir, file)).mtimeMs
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > maxKeep) {
        for (let i = maxKeep; i < files.length; i++) {
          fs.unlinkSync(path.join(this.backupsDir, files[i].file));
        }
      }
    } catch (e) {
      // Ignore prune errors
    }
  }

  /**
   * Log typing session metrics
   */
  public logSession(sessionData: Record<string, any>): void {
    const dateStr = new Date().toISOString().split('T')[0];
    const sessionFile = path.join(this.sessionsDir, `session_${dateStr}.jsonl`);
    const line = JSON.stringify({ timestamp: Date.now(), ...sessionData }) + '\n';
    fs.appendFileSync(sessionFile, line, 'utf-8');
  }

  /**
   * Export all trainer and game data to an external path
   */
  public exportData(targetFilePath: string, fullData: Record<string, any>): void {
    const exportPayload = {
      exportVersion: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: fullData
    };
    fs.writeFileSync(targetFilePath, JSON.stringify(exportPayload, null, 2), 'utf-8');
  }

  /**
   * Import data from an exported file
   */
  public importData(sourceFilePath: string): Record<string, any> {
    const raw = fs.readFileSync(sourceFilePath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed.data) {
      throw new Error('Invalid export format: missing "data" key.');
    }
    return parsed.data;
  }
}
