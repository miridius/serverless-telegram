import { InlineResult, ResponseMethod, ResponseObject } from './telegram';

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
