import { awsAdapter, azureAdapter } from './http/adapters';
import wrapHttp from './http/wrap-http';
import wrapTelegram from './telegram/wrap-telegram';
import type {
  AwsHttpFunction,
  AzureHttpFunction,
  HandlerMap,
  MessageHandler,
} from './types';

// re-exports
export * from './dev-server';
export * from './telegram/env';
export * from './telegram/webhook-utils';
export * from './types';
export * as utils from './utils';
export { wrapTelegram, wrapHttp, awsAdapter, azureAdapter };

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AzureHttpFunction =>
  wrapHttp(wrapTelegram(handler, errorChatId), azureAdapter);

export const createAwsTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AwsHttpFunction => wrapHttp(wrapTelegram(handler, errorChatId), awsAdapter);

export default createAzureTelegramWebhook;
