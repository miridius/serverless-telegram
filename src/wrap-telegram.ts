import type { Message, Update } from 'node-telegram-bot-api';
import { BodyHandler, Logger } from './wrap-azure';
export { Message, Update };

export type MessageHandler = (
  message: Message,
  log: Logger,
) => Promise<Response>;

export type Response = string | ResponseObject | ResponseMethod | NoResponse;

export interface ResponseObject {
  text?: string;
  media?: string[];
  sticker?: string;
  /**
   * Optionally redirect response to a different chat than the message came from
   */
  chat_id?: number;
}

export interface ResponseMethod extends ResponseObject {
  method: 'sendMessage' | 'sendMediaGroup' | 'sendSticker';
  chat_id: number;
}

export type NoResponse = void | null | undefined | false | '' | {};

export const getMessage = (update: Partial<Update>): Message | undefined =>
  update.message ||
  update.edited_message ||
  update.channel_post ||
  update.edited_channel_post;

export const strToObj = (
  r?: Response,
): ResponseObject | ResponseMethod | undefined =>
  typeof r === 'string' ? { text: r } : r ? r : undefined;

export const toMethod = (
  res: ResponseObject | ResponseMethod = {},
  chat_id: number,
): ResponseMethod | void => {
  if (res.text) return { method: 'sendMessage', chat_id, ...res };
  if (res.media) return { method: 'sendMediaGroup', chat_id, ...res };
  if (res.sticker) return { method: 'sendSticker', chat_id, ...res };
};

export const isUpdate = (body: any): body is Partial<Update> =>
  body && typeof body === 'object' && 'update_id' in body;

export const wrapTelegram = (
  handler: MessageHandler,
  errorChatId?: number,
): BodyHandler => async (
  update: unknown,
  log: Logger,
): Promise<ResponseMethod | NoResponse> => {
  try {
    log.verbose('Bot Update:', update);
    const msg = isUpdate(update) && getMessage(update);
    const res = msg && toMethod(strToObj(await handler(msg, log)), msg.chat.id);
    log.verbose('Bot Response:', res);
    return res;
  } catch (err) {
    if (errorChatId) {
      const text = `Bot Error while handling this update:
${JSON.stringify(update, null, 2)}

${err.stack}`;
      log.error(text);
      return {
        method: 'sendMessage',
        chat_id: errorChatId,
        text,
      };
    } else {
      log.error(`Bot Error while handling this update:
${JSON.stringify(update, null, 2)}`);
      throw err;
    }
  }
};

export default wrapTelegram;
