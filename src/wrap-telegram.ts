import type {
  AnswerInlineQueryOptions,
  InlineQuery,
  InlineQueryResult,
  InlineQueryResultArticle,
  InlineQueryResultAudio,
  InlineQueryResultCachedAudio,
  InlineQueryResultCachedDocument,
  InlineQueryResultCachedGif,
  InlineQueryResultCachedMpeg4Gif,
  InlineQueryResultCachedPhoto,
  InlineQueryResultCachedSticker,
  InlineQueryResultCachedVideo,
  InlineQueryResultCachedVoice,
  InlineQueryResultContact,
  InlineQueryResultDocument,
  InlineQueryResultGame,
  InlineQueryResultGif,
  InlineQueryResultLocation,
  InlineQueryResultMpeg4Gif,
  InlineQueryResultPhoto,
  InlineQueryResultVenue,
  InlineQueryResultVideo,
  InlineQueryResultVoice,
  Message,
  Update,
} from 'node-telegram-bot-api';
import {
  BodyHandler,
  Logger,
  HttpResponse,
  isHttpResponse,
} from './wrap-azure';
export { InlineQuery, InlineQueryResult, Message, Update };

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
  // OPTIONAL: any additional parameters for the telegram api method
  [param: string]: any;
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

export type NoResponse = void | null | undefined | false | '' | 0;

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

type TypeAndIdOptional<T extends InlineQueryResult> = {
  type?: T['type'];
  id?: T['id'];
} & Omit<T, 'type' | 'id'>;

export type InlineResult =
  | TypeAndIdOptional<InlineQueryResultCachedAudio>
  | TypeAndIdOptional<InlineQueryResultCachedDocument>
  | TypeAndIdOptional<InlineQueryResultCachedGif>
  | TypeAndIdOptional<InlineQueryResultCachedMpeg4Gif>
  | TypeAndIdOptional<InlineQueryResultCachedPhoto>
  | TypeAndIdOptional<InlineQueryResultCachedSticker>
  | TypeAndIdOptional<InlineQueryResultCachedVideo>
  | TypeAndIdOptional<InlineQueryResultCachedVoice>
  | TypeAndIdOptional<InlineQueryResultArticle>
  | TypeAndIdOptional<InlineQueryResultAudio>
  | TypeAndIdOptional<InlineQueryResultContact>
  | TypeAndIdOptional<InlineQueryResultGame>
  | TypeAndIdOptional<InlineQueryResultDocument>
  | TypeAndIdOptional<InlineQueryResultGif>
  | TypeAndIdOptional<InlineQueryResultLocation>
  | TypeAndIdOptional<InlineQueryResultMpeg4Gif>
  | TypeAndIdOptional<InlineQueryResultPhoto>
  | TypeAndIdOptional<InlineQueryResultVenue>
  | TypeAndIdOptional<InlineQueryResultVideo>
  | TypeAndIdOptional<InlineQueryResultVoice>;

type AllKeys<T> = T extends T ? keyof T : never;
type Mapping<T, K extends keyof T> = { [param in AllKeys<T>]?: T[K] };

const INLINE_TYPE_MAPPING: Mapping<InlineResult, 'type'> = {
  audio_file_id: 'audio',
  document_file_id: 'document',
  gif_file_id: 'gif',
  mpeg4_file_id: 'mpeg4_gif',
  photo_file_id: 'photo',
  sticker_file_id: 'sticker',
  video_file_id: 'video',
  voice_file_id: 'voice',
  url: 'article',
  audio_url: 'audio',
  phone_number: 'contact',
  game_short_name: 'game',
  document_url: 'document',
  gif_url: 'gif',
  mpeg4_url: 'mpeg4_gif',
  photo_url: 'photo',
  address: 'venue',
  video_url: 'video',
  voice_url: 'voice',
};

export interface AnswerInlineQuery extends AnswerInlineQueryOptions {
  results: InlineResult[];
}

export interface AnswerInlineQueryMethod extends AnswerInlineQueryOptions {
  method: 'answerInlineQuery';
  inline_query_id: string;
  results: InlineQueryResult[];
}

export type UpdateResponse =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | HttpResponse
  | NoResponse;

export const isUpdate = (body: any): body is Partial<Update> =>
  body && typeof body === 'object' && 'update_id' in body;

export const getMessage = (update: Partial<Update>): Message | undefined =>
  update.message ||
  update.edited_message ||
  update.channel_post ||
  update.edited_channel_post;

export const strToObj = (res?: Response): Exclude<Response, string> =>
  typeof res === 'string' ? { text: res } : res;

const isNoResponse = (res: any): res is NoResponse => !res;

const isResponseMethod = (
  res: Exclude<Response | InlineResponse, NoResponse>,
): res is ResponseMethod =>
  typeof res === 'object' && 'method' in res && 'chat_id' in res;

const passthroughResponse = (
  res: Response | InlineResponse,
): res is NoResponse | HttpResponse | ResponseMethod =>
  isNoResponse(res) || isHttpResponse(res) || isResponseMethod(res);

const getMethod = (res: ResponseObject): ResponseMethod['method'] | undefined =>
  Object.keys(res)
    .map((key) => METHOD_MAPPING[key])
    .filter((method?) => method)[0];

export const toMethod = (
  res: Exclude<Response, string>,
  chat_id: number,
): UpdateResponse => {
  // fully formed HTTP/API responses (or NoResponse) are returned unchanged
  if (passthroughResponse(res)) return res;
  // determine the telegram api method from content (if not specified)
  const method = res.method || getMethod(res);
  if (!method) {
    throw new Error(`Not a valid message response: ${JSON.stringify(res)}`);
  }
  return { method, chat_id, ...res };
};

const getInlineQueryResultType = (res: InlineResult): InlineResult['type'] => {
  let resultType =
    res.type ||
    Object.keys(res)
      .map((k) => INLINE_TYPE_MAPPING[k as keyof InlineResult])
      .filter((t?) => t)[0];
  if (!resultType) {
    // special cases where there's no unique mandatory parameter
    if ('latitude' in res) {
      resultType = 'location';
    } else if ('title' in res && 'input_message_content' in res) {
      resultType = 'article';
    } else {
      throw new Error(`Not a valid inline result: ${JSON.stringify(res)}`);
    }
  }
  return resultType;
};

export const toInlineQueryResult = (
  res: InlineResult,
  i: number,
): InlineQueryResult => {
  return {
    id: i.toString(),
    type: getInlineQueryResultType(res),
    ...res,
  } as InlineQueryResult;
};

const isAnswerInlineQuery = (res: any): res is AnswerInlineQuery =>
  typeof res === 'object' && Array.isArray(res.results);

export const toAnswerInlineMethod = (
  res: InlineResponse,
  inline_query_id: string,
): AnswerInlineQueryMethod | ResponseMethod | HttpResponse | NoResponse => {
  if (passthroughResponse(res)) return res;
  if (Array.isArray(res)) res = { results: res };
  if (!isAnswerInlineQuery(res)) {
    throw new Error(
      `Not a valid inline query response: ${JSON.stringify(res)}`,
    );
  }
  return {
    method: 'answerInlineQuery',
    inline_query_id,
    ...res,
    results: res.results.map(toInlineQueryResult),
  };
};

export const toBodyHandler = (
  handler: MessageHandler | HandlerMap,
): BodyHandler<UpdateResponse> => {
  const hmap = typeof handler === 'function' ? { message: handler } : handler;
  return async (update: unknown, log: Logger): Promise<UpdateResponse> => {
    log.verbose('Bot Update:', update);
    if (!isUpdate(update)) return;
    const msg = getMessage(update);
    const inline = update.inline_query;
    let res;
    if (msg && hmap.message) {
      res = toMethod(strToObj(await hmap.message(msg, log)), msg.chat.id);
    } else if (inline && hmap.inline) {
      res = toAnswerInlineMethod(await hmap.inline(inline, log), inline.id);
    }
    log.verbose('Bot Response:', res);
    return res;
  };
};

export const wrapErrorReporting = (
  handler: BodyHandler<UpdateResponse>,
  errorChatId?: number,
): BodyHandler<UpdateResponse> => {
  return async (update: unknown, log: Logger): Promise<UpdateResponse> => {
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
): BodyHandler<UpdateResponse> =>
  wrapErrorReporting(toBodyHandler(handler), errorChatId);

export default wrapTelegram;
