import type {
  AnswerInlineQueryOptions,
  InlineQuery,
  InlineQueryResult,
  InlineQueryResultCachedVideo,
  InlineQueryResultPhoto,
  InlineQueryResultVideo,
  Message,
  Update,
} from 'node-telegram-bot-api';
import {
  BodyHandler,
  Logger,
  HttpResponse,
  isHttpResponse,
} from './wrap-azure';
export { Message, Update };

export interface HandlerMap {
  message?: MessageHandler;
  inline?: InlineHandler;
}

export type MessageHandler = (
  message: Message,
  log: Logger,
) => Promise<Response> | Response;

export type Response =
  | string
  | ResponseObject
  | ResponseMethod
  | HttpResponse
  | NoResponse;

export interface ResponseObject {
  // exactly one of the following 4 keys should be included
  text?: string;
  sticker?: string;
  video?: string;
  media?: string[];
  // OPTIONAL: redirect response to a different chat than the message came from
  chat_id?: number;
}

const METHOD_MAPPING: Record<string, ResponseMethod['method']> = {
  text: 'sendMessage',
  sticker: 'sendSticker',
  video: 'sendVideo',
  media: 'sendMediaGroup',
};

export interface ResponseMethod extends ResponseObject {
  method: 'sendMessage' | 'sendSticker' | 'sendVideo' | 'sendMediaGroup';
  chat_id: number;
}

export type NoResponse = void | null | undefined | false | '' | {};

export type InlineHandler = (
  inline: InlineQuery,
  log: Logger,
) => Promise<InlineResponse> | InlineResponse;

export type InlineResponse =
  | InlineResult[]
  | InlineQueryResult[]
  | AnswerInlineQuery
  | HttpResponse
  | NoResponse;

// TODO: add the rest of these
export type InlineResult = PhotoResult | VideoResult | CachedVideoResult;
export type PhotoResult = Omit<InlineQueryResultPhoto, 'id' | 'type'>;
export type VideoResult = Omit<InlineQueryResultVideo, 'id' | 'type'>;
export type CachedVideoResult = Omit<
  InlineQueryResultCachedVideo,
  'id' | 'type'
>;

export interface AnswerInlineQuery extends AnswerInlineQueryOptions {
  results: InlineQueryResult[] | InlineResult[];
}

export interface AnswerInlineQueryMethod extends AnswerInlineQueryOptions {
  method: 'answerInlineQuery';
  inline_query_id: string;
  results: InlineQueryResult[];
}

export const isUpdate = (body: any): body is Partial<Update> =>
  body && typeof body === 'object' && 'update_id' in body;

export const getMessage = (update: Partial<Update>): Message | undefined =>
  update.message ||
  update.edited_message ||
  update.channel_post ||
  update.edited_channel_post;

export const strToObj = (
  r?: Response,
): ResponseObject | ResponseMethod | HttpResponse | undefined =>
  typeof r === 'string' ? { text: r } : r ? r : undefined;

export const toMethod = (
  res: ResponseObject | ResponseMethod | HttpResponse = {},
  chat_id: number,
): ResponseMethod | HttpResponse | void => {
  // allow users to create their own HTTP Response and just pass it through
  if (isHttpResponse(res)) return res;
  // convert the known telegram api methods
  for (const method of Object.keys(res).map((key) => METHOD_MAPPING[key])) {
    if (method) return { method: method, chat_id, ...res };
  }
  // Only ResponseMethod and NoResponse should make it here or there's a problem
  if (!(res as ResponseMethod).method && Object.keys(res).length) {
    throw new Error(`Could not parse response: ${JSON.stringify(res)}`);
  }
};

const isInlineQueryResult = (
  r: InlineResult | InlineQueryResult,
): r is InlineQueryResult => 'id' in r && 'type' in r;

const isPhotoResult = (x: InlineResult): x is PhotoResult => 'photo_url' in x;
const isVideo = (x: InlineResult): x is VideoResult | CachedVideoResult =>
  'video_url' in x || 'video_file_id' in x;

export const toInlineQueryResults = (
  rs: (InlineResult | InlineQueryResult)[],
): InlineQueryResult[] =>
  rs.map((r: InlineResult | InlineQueryResult, i) => {
    if (isInlineQueryResult(r)) return r;
    const id = '' + i;
    if (isPhotoResult(r)) return { type: 'photo', id, ...r };
    if (isVideo(r)) return { type: 'video', id, ...r };
    throw new Error(
      `Could not determine InlineQueryResult type of ${JSON.stringify(r)}`,
    );
  });

const isAnswerInlineQuery = (r: any): r is AnswerInlineQuery =>
  typeof r === 'object' && 'results' in r && Array.isArray(r.results);

export const toInlineResponse = (
  r: InlineResponse,
  inline_query_id: string,
): AnswerInlineQueryMethod | HttpResponse | void => {
  if (!r) return;
  if (isHttpResponse(r)) return r;
  if (Array.isArray(r)) {
    return {
      method: 'answerInlineQuery',
      inline_query_id,
      results: toInlineQueryResults(r),
    };
  }
  if (isAnswerInlineQuery(r)) {
    return {
      method: 'answerInlineQuery',
      inline_query_id,
      ...r,
      results: toInlineQueryResults(r.results),
    };
  }
  throw new Error(
    `Response should either be an array of results or contain a results array: ${JSON.stringify(
      r,
    )}`,
  );
};

export const wrapHandler = (
  handler: MessageHandler | HandlerMap,
): BodyHandler => {
  const hmap = typeof handler === 'function' ? { message: handler } : handler;
  return async (
    update: unknown,
    log: Logger,
  ): Promise<ResponseMethod | NoResponse> => {
    log.verbose('Bot Update:', update);
    if (!isUpdate(update)) return;
    const msg = getMessage(update);
    const inline = update.inline_query;
    let res;
    if (msg && hmap.message) {
      res = toMethod(strToObj(await hmap.message(msg, log)), msg.chat.id);
    } else if (inline && hmap.inline) {
      res = toInlineResponse(await hmap.inline(inline, log), inline.id);
    }
    log.verbose('Bot Response:', res);
    return res;
  };
};

export const wrapErrorReporting = (
  handler: BodyHandler,
  errorChatId?: number,
): BodyHandler => {
  return async (update: unknown, log: Logger) => {
    try {
      return await handler(update, log);
    } catch (err) {
      let message = `Bot Error while handling this update:
${JSON.stringify(update, null, 2)}`;
      if (!errorChatId) {
        // nowhere to send the report to so we just log & throw
        log.error(message);
        throw err;
      }
      // since the error won't be thrown we add the stack trace to the logs
      message += `\n\n${err.stack}`;
      log.error(message);
      return { method: 'sendMessage', chat_id: errorChatId, text: message };
    }
  };
};

export const wrapTelegram = (
  handler: MessageHandler | HandlerMap,
  errorChatId?: number,
): BodyHandler => wrapErrorReporting(wrapHandler(handler), errorChatId);

export default wrapTelegram;
