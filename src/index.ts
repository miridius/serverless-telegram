import wrapTelegram, { MessageHandler } from './wrap-telegram';
import wrapAzure from './wrap-azure';

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (handler: MessageHandler) =>
  wrapAzure(wrapTelegram(handler));

// re-exports
export { wrapAzure, wrapTelegram };
export type { Message } from 'node-telegram-bot-api';
export type { Response, MessageHandler } from './wrap-telegram';
