import { AppendOptions } from 'form-data';
import type {
  AnswerCallbackQueryOptions,
  AnswerInlineQueryOptions,
  CallbackQuery,
  Chat,
  ChatAction,
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
  InputMedia,
  Message,
  Update,
  User,
} from 'node-telegram-bot-api';
import type { CallbackEnv, Env, InlineEnv, MessageEnv } from '../telegram/env';

export type {
  AnswerCallbackQueryOptions,
  AnswerInlineQueryOptions,
  AppendOptions,
  CallbackQuery,
  Chat,
  ChatAction,
  Env,
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
  InputMedia,
  Message,
  Update,
  User,
};

export type Handler<Req, Env, Res> = (req: Req, env: Env) => Promise<Res> | Res;

export type MessageHandler = Handler<Message, MessageEnv, MessageResponse>;
export type InlineHandler = Handler<InlineQuery, InlineEnv, InlineResponse>;
export type CallbackHandler = Handler<
  CallbackQuery,
  CallbackEnv,
  CallbackResponse
>;

export interface HandlerMap {
  message?: MessageHandler;
  inline?: InlineHandler;
  callback?: CallbackHandler;
}

export type MessageResponse =
  | string
  | ResponseObject
  | ResponseMethod
  | NoResponse;

export type InputFile = string | URL | FileBuffer;

export interface ResponseObject {
  // one of the following keys should be included
  text?: string;
  photo?: InputFile;
  audio?: InputFile;
  document?: InputFile;
  video?: InputFile;
  animation?: InputFile;
  voice?: InputFile;
  video_note?: InputFile;
  media?: InputMedia[]; // TODO: simplify & support file uploads
  address?: string;
  latitude?: number;
  phone_number?: string;
  question?: string;
  emoji?: string;
  action?: ChatAction;
  sticker?: string;
  // OPTIONAL: any additional parameters for the telegram api method
  [param: string]: any;
  // OPTIONAL: redirect response to a different chat than the message came from
  chat_id?: number;
}

export interface FileBuffer extends AppendOptions {
  buffer: Buffer;
  filename: string;
}

export const responseFileParams = new Set([
  'photo',
  'audio',
  'document',
  'video',
  'animation',
  'voice',
  'video_note',
]);

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

export type InlineResponse =
  | InlineResult[]
  | AnswerInlineQuery
  | ResponseMethod
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

export type CallbackResponse =
  | string // text only
  | AnswerCallbackQuery
  | NoResponse;

export type AnswerCallbackQuery = Omit<
  AnswerCallbackQueryOptions,
  'callback_query_id'
>;

export interface AnswerCallbackQueryMethod extends AnswerCallbackQueryOptions {
  method: 'answerCallbackQuery';
}

export type UpdateResponse =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | AnswerCallbackQueryMethod
  | NoResponse;

export type TgApiRequest =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | { method: string; [param: string]: any };

export interface SetWebHookOptions {
  url: string;
  certificate?: InputFile;
  max_connections?: number;
  allowed_updates?: string[];
}
