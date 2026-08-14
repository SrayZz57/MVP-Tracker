import { exec } from 'node:child_process';
import { existsSync } from 'node:fs';
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
  return existsSync(LOCKFILE_PATH);
}

export function pingOnce(target = PING_TARGET) {
  return new Promise((resolve) => {
    exec(`ping -n 1 -w 2000 ${target}`, (err, stdout) => {
      if (err) {
        resolve(null);
        return;
      }
      const match = stdout.match(LATENCY_REGEX);
      resolve(match ? Number(match[1]) : null);
    });
  });
}
