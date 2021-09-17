import wrapTelegram from './telegram/wrap-telegram';
import type {
  AwsHttpFunction,
  AzureHttpFunction,
  HandlerMap,
  MessageHandler,
} from './types';
import { wrapAws, wrapAzure } from './wrap-http';

// re-exports
export { DevServer, startDevServer } from './dev-server';
export { Env, InlineEnv, MessageEnv } from './telegram/env';
export { deleteWebhook, setWebhook } from './telegram/webhook-utils';
export * from './types';
export * as utils from './utils';
export { wrapAzure, wrapAws as wrapAws, wrapTelegram };

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AzureHttpFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export const createAwsTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AwsHttpFunction => wrapAws(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
