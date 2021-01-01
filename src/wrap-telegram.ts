import type { Message, Update } from 'node-telegram-bot-api';

export type MessageHandler = (message: Message) => Promise<Response>;

export type Response = ResponseObject | string | undefined;

export interface ResponseObject {
  text?: string;
  media?: string[];
  sticker?: string;
}

export type ResponseMethod =
  | SendMediaGroup
  | SendMessage
  | SendSticker
  | undefined;

export interface SendMessage {
  method: 'sendMessage';
  chat_id: Id;
  text: string;
}

export interface SendMediaGroup {
  method: 'sendMediaGroup';
  chat_id: Id;
  media: string[];
}

export interface SendSticker {
  method: 'sendSticker';
  chat_id: Id;
  sticker: string;
}

export type Id = number | string; // integer or string

export const getMessage = (update: Update): Message | undefined =>
  update.message || update.edited_message;

export const strToText = (r?: Response): ResponseObject | undefined =>
  typeof r === 'string' ? { text: r } : r;

export const toResponseMethod = (
  { media, text, sticker }: ResponseObject = {},
  chat_id: Id,
): ResponseMethod => {
  if (text) return { method: 'sendMessage', text, chat_id };
  if (media) return { method: 'sendMediaGroup', media, chat_id };
  if (sticker) return { method: 'sendSticker', sticker, chat_id };
  return;
};

export const wrapTelegram = (handler: MessageHandler) => async (
  update: Update,
): Promise<ResponseMethod> => {
  const msg = getMessage(update);
  return msg && toResponseMethod(strToText(await handler(msg)), msg.chat.id);
};

export default wrapTelegram;
