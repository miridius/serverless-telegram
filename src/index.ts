import wrapTelegram, { MessageHandler } from './wrap-telegram';
import wrapAzure from './wrap-azure';

// re-exports
export { wrapAzure, wrapTelegram };
export type { Message, Update } from 'node-telegram-bot-api';
export type { Response, MessageHandler } from './wrap-telegram';
export type { HttpRequest, Context, BodyHandler } from './wrap-azure';

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler,
  errorChatId?: number,
) => wrapAzure(wrapTelegram(handler, errorChatId));
