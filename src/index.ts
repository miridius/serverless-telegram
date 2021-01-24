import wrapTelegram, { MessageHandler, HandlerMap } from './wrap-telegram';
import wrapAzure, { AzureFunction } from './wrap-azure';

// re-exports
export { wrapAzure, wrapTelegram };
export type {
  AnswerInlineQuery,
  Chat,
  HandlerMap,
  InlineHandler,
  InlineQuery,
  InlineQueryResult,
  InlineResult,
  Message,
  MessageHandler,
  NoResponse,
  Response,
  ResponseMethod,
  ResponseObject,
  Update,
  User,
} from './wrap-telegram';
export type {
  AzureFunction,
  BodyHandler,
  Context,
  HttpRequest,
  HttpResponse,
  Logger,
} from './wrap-azure';

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AzureFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
