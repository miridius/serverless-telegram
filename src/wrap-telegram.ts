import type {
  AnswerInlineQueryOptions,
  InlineQuery,
  InlineQueryResult,
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
  // TODO: add the rest of these
  // exactly one of the following 4 keys should be included
  text?: string;
  sticker?: string;
  video?: string;
  media?: string[];
  // OPTIONAL: redirect response to a different chat than the message came from
  chat_id?: number;
}

// TODO: add the rest of these
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
  | AnswerInlineQuery
  | ResponseMethod
  | HttpResponse
  | NoResponse;

export type InlineResult = Partial<InlineQueryResult>;

// TODO: add the rest of these
const INLINE_TYPE_MAPPING: Record<string, InlineQueryResult['type']> = {
  photo_url: 'photo',
  video_url: 'video',
  video_file_id: 'video',
};

export interface AnswerInlineQuery extends AnswerInlineQueryOptions {
  results: InlineResult[];
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
    if (method) return { method, chat_id, ...res };
  }
  // Only ResponseMethod and NoResponse should make it here or there's a problem
  if (!(res as ResponseMethod).method && Object.keys(res).length) {
    throw new Error(`Could not parse response: ${JSON.stringify(res)}`);
  }
};

const toInlineQueryResult = (r: InlineResult, i: number): InlineQueryResult => {
  r.id ??= i.toString();
  r.type ??= Object.keys(r)
    .map((k) => INLINE_TYPE_MAPPING[k])
    .filter((type) => type)[0];
  if (!r.type) {
    throw new Error(
      `Could not determine InlineQueryResult type of ${JSON.stringify(r)}`,
    );
  }
  return r as InlineQueryResult;
};

export const toInlineQueryResults = (rs: InlineResult[]): InlineQueryResult[] =>
  rs.map(toInlineQueryResult);

const isAnswerInlineQuery = (r: any): r is AnswerInlineQuery =>
  typeof r === 'object' && 'results' in r && Array.isArray(r.results);

export const toInlineResponse = (
  r: InlineResponse,
  inline_query_id: string,
): AnswerInlineQueryMethod | ResponseMethod | HttpResponse | void => {
  if (!r) return;
  if (isHttpResponse(r)) return r;
  if ('method' in r && 'chat_id' in r) return r;
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
  return async (update: unknown, log: Logger) => {
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
