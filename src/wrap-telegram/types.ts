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
  // one of the following keys should be included
  text?: string;
  photo?: string;
  audio?: string;
  document?: string;
  video?: string;
  animation?: string;
  voice?: string;
  video_note?: string;
  media?: string[];
  address?: string;
  latitude?: number;
  phone_number?: string;
  question?: string;
  emoji?: string;
  action?: string;
  sticker?: string;
  // OPTIONAL: any additional parameters for the telegram api method
  [param: string]: any;
  // OPTIONAL: redirect response to a different chat than the message came from
  chat_id?: number;
}

export interface ResponseMethod extends ResponseObject {
  method:
    | 'sendMessage'
    | 'sendPhoto'
    | 'sendAudio'
    | 'sendDocument'
    | 'sendVideo'
    | 'sendAnimation'
    | 'sendVoice'
    | 'sendVideoNote'
    | 'sendMediaGroup'
    | 'sendVenue'
    | 'sendLocation'
    | 'sendContact'
    | 'sendPoll'
    | 'sendDice'
    | 'sendChatAction'
    | 'sendSticker';
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
