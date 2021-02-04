import type { MessageHandler, HandlerMap } from './wrap-telegram/types';
import wrapTelegram from './wrap-telegram';
import wrapAzure, { AzureFunction } from './wrap-azure';

// re-exports
export { wrapAzure, wrapTelegram };
export type {
  AnswerInlineQuery,
  Chat,
  Env,
  HandlerMap,
  InlineEnv,
  InlineHandler,
  InlineQuery,
  InlineQueryResult,
  InlineResult,
  Message,
  MessageEnv,
  MessageHandler,
  MessageResponse,
  NoResponse,
  ResponseMethod,
  ResponseObject,
  TgApiRequest,
  Update,
  User,
} from './wrap-telegram/types';
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
