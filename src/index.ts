import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { AzureHttpFunction, wrapAws, wrapAzure } from './wrap-http';
import wrapTelegram from './wrap-telegram';
import type {
  HandlerMap,
  MessageHandler,
  UpdateResponse,
} from './wrap-telegram/types';

// re-exports
export { DevServer, startDevServer } from './dev-server';
export * as utils from './utils';
export type {
  AzureHttpFunction,
  BodyHandler,
  Context,
  HttpRequest,
  HttpResponse,
  Logger,
} from './wrap-http';
export { Env, InlineEnv, MessageEnv } from './wrap-telegram/env';
export type {
  AnswerInlineQuery,
  Chat,
  FileBuffer,
  HandlerMap,
  InlineHandler,
  InlineQuery,
  InlineQueryResult,
  InlineResult,
  InputFile,
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
export { wrapAzure, wrapAws, wrapTelegram };

// single combined wrapper for convenience
export const createAzureTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): AzureHttpFunction => wrapAzure(wrapTelegram(handler, errorChatId));

export const createAwsTelegramWebhook = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): APIGatewayProxyHandlerV2<UpdateResponse> =>
  wrapAws(wrapTelegram(handler, errorChatId));

export default createAzureTelegramWebhook;
