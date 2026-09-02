import { execFile } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const LOCKFILE_PATH = path.join(
  process.env.LOCALAPPDATA || '',
  'Riot Games',
  'Riot Client',
  'Config',
  'lockfile',
);

const PING_TARGET = '1.1.1.1';
const LATENCY_REGEX = /(?:temps|time)[=<](\d+)/i;

export function isValorantRunning() {
  if (!existsSync(LOCKFILE_PATH)) return false;

  let pid;
  try {
    pid = Number(readFileSync(LOCKFILE_PATH, 'utf-8').split(':')[1]);
  } catch {
    return false;
  }
  if (!pid) return false;

  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === 'EPERM';
  }
}

export function pingOnce(target = PING_TARGET) {
  return new Promise((resolve) => {
    execFile('ping', ['-n', '1', '-w', '2000', target], (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const match = stdout.match(LATENCY_REGEX);
      resolve(match ? Number(match[1]) : null);
    });
  });
}
