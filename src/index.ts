import wrapTelegram, { MessageHandler, HandlerMap } from './wrap-telegram';
import wrapAzure, { AzureFunction } from './wrap-azure';

// re-exports
export { wrapAzure, wrapTelegram };
export type {
  HandlerMap,
  MessageHandler,
  Update,
  Message,
  Response,
  ResponseObject,
  ResponseMethod,
  NoResponse,
  InlineHandler,
  InlineQuery,
  InlineResult,
  InlineQueryResult,
  AnswerInlineQuery,
} from './wrap-telegram';
export type {
  AzureFunction,
  HttpRequest,
  HttpResponse,
  Context,
  Logger,
  BodyHandler,
} from './wrap-azure';

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AzureFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
