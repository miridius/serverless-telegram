import { Context } from '../wrap-http';
import {
  callTgApi,
  toAnswerInlineMethod,
  toResponseMethod,
} from './telegram-api';
import type {
  InlineQuery,
  InlineResponse,
  Message,
  MessageResponse,
  UpdateResponse,
} from './types';

export type Logger = Pick<typeof console, 'debug' | 'info' | 'warn' | 'error'>;
export const getLogger = (ctx: Context): Logger =>
  ctx && typeof ctx === 'object' && 'log' in ctx
    ? { debug: ctx.log.verbose, ...ctx.log }
    : console;

export class Env<R> {
  readonly context: Context;
  readonly debug: Logger['debug'];
  readonly info: Logger['info'];
  readonly warn: Logger['warn'];
  readonly error: Logger['error'];

  // let the user add additional properties if they want
  // [k: string]: any;

  constructor(context: Context) {
    this.context = context;
    const { debug, info, warn, error } = getLogger(context);
    this.debug = debug;
    this.info = info;
    this.warn = warn;
    this.error = error;
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
  readonly message: Message;

  constructor(context: Context, message: Message) {
    super(context);
    this.message = message;
  }

  toUpdateRes(res: MessageResponse) {
    return toResponseMethod(res, this.message.chat.id);
  }
}

export class InlineEnv extends Env<InlineResponse> {
  readonly inlineQuery: InlineQuery;

  constructor(context: Context, inlineQuery: InlineQuery) {
    super(context);
    this.inlineQuery = inlineQuery;
  }

  toUpdateRes(res: InlineResponse) {
    return toAnswerInlineMethod(res, this.inlineQuery.id);
  }
}
