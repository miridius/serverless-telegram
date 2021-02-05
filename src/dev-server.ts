import { Update } from 'node-telegram-bot-api';
import { AzureHttpFunction, Context, HttpRequest, Logger } from './wrap-azure';
import { callTgApi } from './wrap-telegram/telegram-api';
import { resolve } from 'path';
import { readdirSync } from 'fs';

const log = console.log as Logger;
const { debug: verbose, info, warn, error } = console;
Object.assign(log, { verbose, info, warn, error });

export const calculateNewOffset = (offset?: number, update?: Update) => {
  if (!update) return offset;
  const newOffset = Math.max(offset ?? 0, update.update_id + 1);
  return isNaN(newOffset) ? offset : newOffset;
};

export class DevServer {
  webhook: AzureHttpFunction;
  timeout: number;

  running = false;
  offset?: number;

  constructor(webhook: AzureHttpFunction, longPollTimeoutSecs: number = 55) {
    this.webhook = webhook;
    this.timeout = longPollTimeoutSecs;
  }

  stop() {
    this.running = false;
    log.info('server will stop when the current update cycle completes');
    return this;
  }

  start() {
    this.running = true;
    this.getUpdates();
    return this;
  }

  private async getUpdates() {
    if (!this.running) return;
    log.verbose(new Date(), `long polling for updates (max ${this.timeout}s)`);
    const updates = await callTgApi({
      method: 'getUpdates',
      offset: this.offset,
      timeout: this.timeout,
    });
    // process updates in parallel
    await Promise.all(updates.map((u: Update) => this.handleUpdate(u)));
    setImmediate(() => this.getUpdates());
  }

  private async handleUpdate(body: Update) {
    this.offset = calculateNewOffset(this.offset, body);
    const res = await this.webhook({ log } as Context, { body } as HttpRequest);
    return res && callTgApi(res.body);
  }
}

const isFnDir = (path: string) => readdirSync(path).includes('function.json');

const findFunctionDirs = (rootPath: string) =>
  readdirSync(rootPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => !name.startsWith('.') && !(name === 'node_modules'))
    .map((name) => resolve(rootPath, name))
    .filter(isFnDir);

const getScriptPath = (fnPath: string) =>
  resolve(fnPath, require(resolve(fnPath, 'function.json')).scriptFile || '.');

export const findFunctionEntrypoints = (projectOrFunctionDir: string = '.') =>
  isFnDir(projectOrFunctionDir)
    ? [getScriptPath(projectOrFunctionDir)]
    : findFunctionDirs(projectOrFunctionDir).map(getScriptPath);

/**
 * Starts a local dev server (see `README.md`) for either a specific function or
 * for all functions in the project (the latter is the default).
 *
 * Your dev bot's token must be set in the environment variable `BOT_API_TOKEN`.
 * The recommended way to do this is by using a `.env` file with {@link https://www.npmjs.com/package/env-cmd|env-cmd}
 *
 * This function can be run from the command line using `npx start-dev-server`
 *
 * @param projectOrFunctionDir pass either a specific function directory, or
 * your project root (defaults to `'.'`) to search it for function directories.
 *
 * @param timeout Max timeout in seconds for long polling, defaults to `55`.
 * See the {@link https://core.telegram.org/bots/api#getupdates|docs} for more.
 *
 * @returns an array of dev servers. Calling `.stop()` on one will cause it to
 * stop getting updates but only *after* the current update cycle is done (in
 * other words, at most `timeout` seconds)
 */
export const startDevServer = (
  projectOrFunctionDir?: string,
  timeout?: number,
) =>
  findFunctionEntrypoints(projectOrFunctionDir).map((path) => {
    log.info('Starting dev server for', path);
    return new DevServer(require(path), timeout).start();
  });
