import fs from 'fs';
import path from 'path';
import { nowIso } from './utils.js';

const LOG_DIR = path.join(process.cwd(), 'logs');
const APP_LOG_PATH = path.join(LOG_DIR, 'app.log');
const ERROR_LOG_PATH = path.join(LOG_DIR, 'error.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function writeLine(filePath, payload) {
  ensureLogDir();
  fs.appendFileSync(filePath, `${JSON.stringify(payload)}\n`, 'utf8');
}

export function logInfo(message, context = {}) {
  writeLine(APP_LOG_PATH, {
    level: 'info',
    time: nowIso(),
    message,
    ...context
  });
}

export function logError(message, error, context = {}) {
  const details = error instanceof Error
    ? { name: error.name, message: error.message, stack: error.stack }
    : { error };

  const payload = {
    level: 'error',
    time: nowIso(),
    message,
    ...context,
    ...details
  };

  writeLine(APP_LOG_PATH, payload);
  writeLine(ERROR_LOG_PATH, payload);
}
