import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { existsSync, readdirSync } from 'fs';
import { Update } from 'node-telegram-bot-api';
import { resolve } from 'path';
import {
  AzureContext,
  AzureHttpFunction,
  HttpRequest,
  Logger,
} from './wrap-http';
import { callTgApi } from './wrap-telegram/telegram-api';

const withDate = (logger: (...args: any[]) => any) => (...args: any[]) =>
  logger(new Date(), ...args);

const log = withDate(console.log) as Logger;
Object.assign(log, {
  verbose: withDate(console.debug),
  info: withDate(console.info),
  warn: withDate(console.warn),
  error: withDate(console.error),
});

export const calculateNewOffset = (offset?: number, update?: Update) => {
  if (!update) return offset;
  const newOffset = Math.max(offset ?? 0, update.update_id + 1);
  return isNaN(newOffset) ? offset : newOffset;
};

interface AzureWebhook {
  type: 'azure';
  handler: AzureHttpFunction;
  path: string;
}
interface AwsWebhook {
  type: 'aws';
  handler: APIGatewayProxyHandlerV2;
  path: string;
}

type Webhook = AzureWebhook | AwsWebhook;

export class DevServer {
  webhook: Webhook;
  timeout: number;

  running = false;
  offset?: number;

  constructor(webhook: Webhook, longPollTimeoutSecs: number = 55) {
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
    log.verbose(`long polling for updates (max timeout: ${this.timeout}s)`);
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
    const res = await (this.webhook.type === 'azure'
      ? this.webhook.handler({ log } as AzureContext, { body } as HttpRequest)
      : this.webhook.handler(
          { body: JSON.stringify(body) } as any,
          null as any,
          null as any,
        ));
    const resBody =
      res && typeof res === 'object' && 'body' in res ? res.body : res;
    return resBody && callTgApi(resBody);
  }
}

const isFnDir = (path: string) => {
  const files = readdirSync(path);
  return (
    files.includes('function.json') ||
    (files.includes('package.json') &&
      require(resolve(path, 'package.json')).main)
  );
};

export const findFunctionDirs = (rootPath: string = '.') =>
  isFnDir(rootPath)
    ? [rootPath]
    : readdirSync(rootPath, { withFileTypes: true })
        .filter((dirent) => dirent.isDirectory())
        .map((dirent) => dirent.name)
        .filter((name) => !name.startsWith('.') && !(name === 'node_modules'))
        .map((name) => resolve(rootPath, name))
        .filter(isFnDir);

// const requireIfExists = (path: string) =>
//   existsSync(path) ? require(path) : undefined;

const loadWebhookFn = (path: string): Webhook =>
  existsSync(resolve(path, 'function.json'))
    ? {
        type: 'azure',
        handler: require(resolve(
          path,
          require(resolve(path, 'function.json')).scriptFile || '.',
        )),
        path,
      }
    : { type: 'aws', handler: require(resolve(path)).lambdaHandler, path };

export const loadWebhookFunctions = (projectOrFunctionDir: string = '.') =>
  isFnDir(projectOrFunctionDir)
    ? [loadWebhookFn(projectOrFunctionDir)]
    : findFunctionDirs(projectOrFunctionDir).map(loadWebhookFn);

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
): DevServer[] => {
  const webhooks = loadWebhookFunctions(projectOrFunctionDir);
  if (!webhooks?.length) throw new Error('no function entry points found');
  return webhooks.map((webhook) => {
    log.info('Starting dev server for', webhook.path);
    return new DevServer(webhook, timeout).start();
  });
};
