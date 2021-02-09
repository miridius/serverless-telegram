import { Context, Logger } from '../wrap-azure';
import type {
  InlineQuery,
  InlineResponse,
  Message,
  MessageResponse,
  UpdateResponse,
} from './types';
import {
  callTgApi,
  toAnswerInlineMethod,
  toResponseMethod,
} from './telegram-api';

export class Env<R> {
  context: Context;
  debug: Logger['verbose'];
  info: Logger['info'];
  warn: Logger['warn'];
  error: Logger['error'];

  // let the user add additional properties if they want
  // [k: string]: any;

  constructor(context: Context) {
    this.context = context;
    this.debug = context.log.verbose;
    this.info = context.log.info;
    this.warn = context.log.warn;
    this.error = context.log.error;
  }

  /**
   * Call the Telegram Bot API asynchronously *during* handler execution, as an
   * alternative to simply returning it from the handler. See `README.md`.
   * @param res Any of the allowable response types from the current handler
   * (i.e. `MessageResponse` or `InlineResponse`)
   * @returns a promise resolving to the API call result (if any)
   */
  async send(res: R): Promise<any> {
    const req = this.toUpdateRes(res);
    if (req) {
      this.debug('calling telegram API:', req);
      const apiRes = await callTgApi(req);
      this.debug('API result:', apiRes);
      return apiRes;
    }
  }

  toUpdateRes(_res: R): UpdateResponse {
    throw new Error('toUpdateRes must be implemented by subclass!');
  }
}

export class MessageEnv extends Env<MessageResponse> {
  message: Message;

  constructor(context: Context, message: Message) {
    super(context);
    this.message = message;
  }

  toUpdateRes(res: MessageResponse) {
    return toResponseMethod(res, this.message.chat.id);
  }
}

export class InlineEnv extends Env<InlineResponse> {
  inlineQuery: InlineQuery;

  constructor(context: Context, inlineQuery: InlineQuery) {
    super(context);
    this.inlineQuery = inlineQuery;
  }

  toUpdateRes(res: InlineResponse) {
    return toAnswerInlineMethod(res, this.inlineQuery.id);
  }
}
