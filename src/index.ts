import type { MessageHandler, HandlerMap } from './wrap-telegram/types';
import wrapTelegram from './wrap-telegram';
import wrapAzure, { AzureHttpFunction } from './wrap-azure';

// re-exports
export { startDevServer, DevServer } from './dev-server';
export { wrapAzure, wrapTelegram };
export { Env, MessageEnv, InlineEnv } from './wrap-telegram/env';
export * as utils from './utils';
export type {
  AnswerInlineQuery,
  Chat,
  FileBuffer,
  HandlerMap,
  InlineHandler,
  InlineQuery,
  InlineQueryResult,
  InlineResult,
  Message,
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
  AzureHttpFunction,
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
): AzureHttpFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
