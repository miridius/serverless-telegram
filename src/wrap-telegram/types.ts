import { AppendOptions } from 'form-data';
import type {
  AnswerInlineQueryOptions,
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
import type { Env, MessageEnv, InlineEnv } from './env';

export type {
  Chat,
  Env,
  InlineEnv,
  InlineQuery,
  InlineQueryResult,
  Message,
  MessageEnv,
  Update,
  User,
};

export type Handler<Req, Env, Res> = (req: Req, env: Env) => Promise<Res> | Res;

export type MessageHandler = Handler<Message, MessageEnv, MessageResponse>;
export type InlineHandler = Handler<InlineQuery, InlineEnv, InlineResponse>;

export interface HandlerMap {
  message?: MessageHandler;
  inline?: InlineHandler;
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

export type UpdateResponse =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | NoResponse;

export type TgApiRequest =
  | ResponseMethod
  | AnswerInlineQueryMethod
  | { method: string; [param: string]: any };

// utility types
export type AllKeys<T> = T extends T ? keyof T : never;
export type Mapping<T, K extends keyof T> = { [param in AllKeys<T>]?: T[K] };

// Mappings
export const METHOD_MAPPING: Record<
  keyof ResponseObject,
  ResponseMethod['method']
> = {
  text: 'sendMessage',
  photo: 'sendPhoto',
  audio: 'sendAudio',
  document: 'sendDocument',
  video: 'sendVideo',
  animation: 'sendAnimation',
  voice: 'sendVoice',
  video_note: 'sendVideoNote',
  media: 'sendMediaGroup',
  address: 'sendVenue',
  latitude: 'sendLocation',
  phone_number: 'sendContact',
  question: 'sendPoll',
  emoji: 'sendDice',
  action: 'sendChatAction',
  sticker: 'sendSticker',
};

export const INLINE_TYPE_MAPPING: Mapping<InlineResult, 'type'> = {
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

export interface SetWebHookOptions {
  url: string;
  certificate?: InputFile;
  max_connections?: number;
  allowed_updates?: string[];
}
