import { existsSync, readdirSync, readFileSync } from 'fs';
import { Update } from 'node-telegram-bot-api';
import { resolve } from 'path';
import { Adapter, Fn } from '.';
import adapters from './http/adapters';
import { callTgApi } from './telegram/telegram-api';
import { defaultWebhookOpts } from './telegram/webhook-utils';
import type {
  AwsHttpFunction,
  AzureContext,
  AzureHttpFunction,
  AzureLogger,
} from './types';

const LOG_LEVELS = ['debug', 'info', 'warn', 'error', 'silent'] as const;
type LogLevel = typeof LOG_LEVELS[number];

const logFn = (
  logger: (...args: any[]) => any,
  level: LogLevel,
  minLevel: LogLevel,
) =>
  LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(minLevel)
    ? (...args: any[]) => logger(new Date(), level.toUpperCase(), ...args)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    : (..._: any[]) => undefined;

const createLogger = (minLogLevel: LogLevel): AzureLogger => {
  const logger = logFn(console.log, 'info', minLogLevel) as AzureLogger;
  Object.assign(logger, {
    verbose: logFn(console.debug, 'debug', minLogLevel),
    info: logFn(console.info, 'info', minLogLevel),
    warn: logFn(console.warn, 'warn', minLogLevel),
    error: logFn(console.error, 'error', minLogLevel),
  });
  return logger;
};

interface AzureWebhook {
  type: 'azure';
  handler: AzureHttpFunction;
  path: string;
}

interface AwsWebhook {
  type: 'aws';
  handler: AwsHttpFunction;
  path: string;
}

type Webhook = AzureWebhook | AwsWebhook;

export class DevServer<T extends Webhook = Webhook> {
  running = false;
  offset?: number;
  ctx: AzureContext;
  adapter: Adapter<T['handler']>;

  constructor(
    private webhook: T,
    private log: AzureLogger = createLogger('debug'),
    private timeout = 55,
  ) {
    this.ctx = { log } as any;
    this.adapter = adapters[webhook.type];
  }

  stop() {
    this.running = false;
    this.log.info('server will stop when the current update cycle completes');
    return this;
  }

  start() {
    this.running = true;
    this.getUpdates();
    return this;
  }

  private async getUpdates() {
    if (!this.running) return;
    this.log.verbose(
      `long polling for updates (max timeout: ${this.timeout}s)`,
    );
    const updates = await callTgApi({
      method: 'getUpdates',
      offset: this.offset,
      timeout: this.timeout,
      allowed_updates: defaultWebhookOpts.allowed_updates,
    });
    // process updates in parallel
    await Promise.all(updates.map((u: Update) => this.handleUpdate(u)));
    setImmediate(() => this.getUpdates());
  }

  private async handleUpdate(body: Update) {
    this.updateOffset(body);
    try {
      await this.callHandler(this.adapter, this.webhook.handler, body);
    } catch (e) {
      this.log.error(e);
    }
  }

  private async callHandler<F extends Fn>(
    adapter: Adapter<F>,
    handler: F,
    body: Update,
  ) {
    const res = await handler(...adapter.encodeArgs(body, this.ctx));
    const req = adapter.decodeResponse(res);
    if (req) await callTgApi(req);
  }

  private updateOffset(update?: Update) {
    if (!update) return;
    const newOffset = Math.max(this.offset ?? 0, update.update_id + 1);
    if (!isNaN(newOffset)) this.offset = newOffset;
  }
}

const isAzureFnPath = (path: string) =>
  readdirSync(path).includes('function.json');

const isAwsHandlerPath = (path: string) => path !== '.' && path.includes('.');

const findAzureFunctionDirs = (rootPath: string) =>
  readdirSync(rootPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name)
    .filter((name) => !name.startsWith('.') && !(name === 'node_modules'))
    .map((name) => resolve(rootPath, name))
    .filter(isAzureFnPath);

const nonNull = <T>(x: T): x is Exclude<T, null> => x !== null;

const findAwsHandlerPaths = (projectDir: string) =>
  readFileSync(resolve(projectDir, 'template.yml'), 'utf-8')
    .split('\n')
    .map((line) => line.match(/^\s+Handler:\s+(.*)$/))
    .filter(nonNull)
    .map((match) => resolve(projectDir, match[1]));

const loadAzureWebhook = (path: string): Webhook => ({
  type: 'azure',
  handler: require(resolve(
    path,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(resolve(path, 'function.json')).scriptFile || '.',
  )),
  path,
});

const loadAwsWebhook = (path: string): Webhook => {
  const [file, methodName] = path.split('.');
  return {
    type: 'aws',
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    handler: require(resolve(file))[methodName],
    path,
  };
};

const loadAzureWebhookFunctions = (projectOrFunctionDir: string) =>
  isAzureFnPath(projectOrFunctionDir)
    ? [loadAzureWebhook(projectOrFunctionDir)]
    : findAzureFunctionDirs(projectOrFunctionDir).map(loadAzureWebhook);

const loadAwsWebhookFunctions = (projectDirOrHandlerPath: string) =>
  isAwsHandlerPath(projectDirOrHandlerPath)
    ? [loadAwsWebhook(projectDirOrHandlerPath)]
    : findAwsHandlerPaths(projectDirOrHandlerPath).map(loadAwsWebhook);

const isAws = (projectDirOrHandlerPath: string) =>
  existsSync(resolve(projectDirOrHandlerPath, 'template.yml')) ||
  isAwsHandlerPath(projectDirOrHandlerPath);

export const loadWebhooks = (projectOrFunctionDir = '.'): Webhook[] =>
  isAws(projectOrFunctionDir)
    ? loadAwsWebhookFunctions(projectOrFunctionDir)
    : loadAzureWebhookFunctions(projectOrFunctionDir);

/**
 * Starts a local dev server (see `README.md`) for either a specific function or
 * for all functions in the project (the latter is the default).
 *
 * Your dev bot's token must be set in the environment variable `BOT_API_TOKEN`.
 * The recommended way to do this is by using a `.env` file with {@link https://www.npmjs.com/package/env-cmd|env-cmd}
 *
 * This function can be run from the command line using `npx start-dev-server`
 *
 * @param projectOrFunctionDirOrHandlerPath Azure: pass either a specific function directory,
 * or your project root (defaults to `'.'`) to search it for function
 * directories. AWS: pass either a specific handler path or your project root
 * (defaults to `'.'`) to read the template.yml and find all lambda handlers.
 *
 * @param minLogLevel Set the granularity of the log messages printed to console
 * (default: debug)
 *
 * @param timeout Max timeout in seconds for long polling, defaults to `55`.
 * See the {@link https://core.telegram.org/bots/api#getupdates|docs} for more.
 *
 * @returns an array of dev servers. Calling `.stop()` on one will cause it to
 * stop getting updates but only *after* the current update cycle is done (in
 * other words, at most `timeout` seconds)
 */
export const startDevServer = (
  projectOrFunctionDirOrHandlerPath?: string,
  minLogLevel: LogLevel = 'debug',
  timeout = 55,
): DevServer[] => {
  const webhooks = loadWebhooks(projectOrFunctionDirOrHandlerPath);
  if (!webhooks.length) throw new Error('no function entry points found');
  const log = createLogger(minLogLevel);
  return webhooks.map((webhook) => {
    log.info('Starting dev server for', webhook.path);
    return new DevServer(webhook, log, timeout).start();
  });
};
