import wrapTelegram, { MessageHandler } from './wrap-telegram';
import wrapAzure, { AzureFunction } from './wrap-azure';

// re-exports
export { wrapAzure, wrapTelegram };
export type {
  Update,
  Message,
  Response,
  MessageHandler,
} from './wrap-telegram';
export type {
  AzureFunction,
  HttpRequest,
  Context,
  Logger,
  BodyHandler,
} from './wrap-azure';

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler,
  errorChatId?: number,
): AzureFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
