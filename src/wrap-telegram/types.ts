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
} from 'node-telegram-bot-api';
import type { HttpResponse, Logger } from '../wrap-azure';

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

export interface ResponseMethod extends ResponseObject {
  method: 'sendMessage' | 'sendSticker' | 'sendVideo' | 'sendMediaGroup';
  chat_id: number;
}

export type NoResponse = void | null | undefined | false | '' | 0;

export type UpdateResponse =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | HttpResponse
  | NoResponse;

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

export interface AnswerInlineQuery extends AnswerInlineQueryOptions {
  results: InlineResult[];
}

export interface AnswerInlineQueryMethod extends AnswerInlineQueryOptions {
  method: 'answerInlineQuery';
  inline_query_id: string;
  results: InlineQueryResult[];
}

// utility types
export type AllKeys<T> = T extends T ? keyof T : never;
export type Mapping<T, K extends keyof T> = { [param in AllKeys<T>]?: T[K] };
