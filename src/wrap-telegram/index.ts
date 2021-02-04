import type {
  HandlerMap,
  MessageHandler,
  UpdateResponse,
  Message,
  Update,
} from './types';
import { BodyHandler, Logger } from '../wrap-azure';
import { InlineEnv, MessageEnv } from './env';
import { callTgApi, hasFileParams } from './telegram-api';

const isObject = (x: unknown): x is Exclude<object, null> =>
  typeof x === 'object' && x !== null;

export const isUpdate = (body: unknown): body is Update =>
  isObject(body) && 'update_id' in body;

export const getMessage = (update: Partial<Update>): Message | undefined =>
  update.message ||
  update.edited_message ||
  update.channel_post ||
  update.edited_channel_post;

/**
 * Checks if the given update response can be simply returned (no file uploads)
 * If so, returns it. Otherwise sends it via the API and returns undefined
 */
export const sendOrReturnRes = async (res: UpdateResponse) => {
  // check for file stream parameters
  if (res && hasFileParams(res)) {
    await callTgApi(res, true);
    return undefined;
  } else {
    return res;
  }
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
    let env: MessageEnv | InlineEnv | undefined;
    if (msg && hmap.message) {
      env = new MessageEnv(log, update, msg, hmap.message);
    } else if (inline && hmap.inline) {
      env = new InlineEnv(log, update, inline, hmap.inline);
    }
    const res: UpdateResponse = env && (await env.execute());
    log.verbose('Bot Response:', res);
    return sendOrReturnRes(res);
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
