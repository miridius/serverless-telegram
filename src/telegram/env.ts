import { NoResponse, TgApiRequest } from '..';
import type {
  CallbackQuery,
  CallbackResponse,
  Context,
  InlineQuery,
  InlineResponse,
  Logger,
  Message,
  MessageResponse,
  UpdateResponse,
} from '../types';
import {
  callTgApi,
  toAnswerCallbackMethod,
  toAnswerInlineMethod,
  toResponseMethod,
} from './telegram-api';

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
    const req = this.toApiRequest(res);
    if (req) {
      this.debug('calling telegram API:', req);
      const apiRes = await callTgApi(req);
      this.debug(req.method, 'API result:', apiRes);
      return apiRes;
    }
  }

  toApiRequest(res: R): TgApiRequest | NoResponse {
    return this.toUpdateRes(res);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  toUpdateRes(_res: R): UpdateResponse {
    throw new Error('toUpdateRes must be implemented by subclass!');
  }
}

export class MessageEnv extends Env<MessageResponse> {
  readonly chatId: number;

  constructor(context: Context, public readonly message: Message) {
    super(context);
    this.chatId = message.chat.id;
  }

  toUpdateRes(res: MessageResponse) {
    return toResponseMethod(res, this.chatId);
  }
}

export class InlineEnv extends Env<InlineResponse> {
  constructor(context: Context, public readonly inlineQuery: InlineQuery) {
    super(context);
  }

  toUpdateRes(res: InlineResponse) {
    return toAnswerInlineMethod(res, this.inlineQuery.id);
  }
}

export class CallbackEnv extends Env<CallbackResponse | MessageResponse> {
  readonly chatId?: number;

  constructor(context: Context, public readonly callbackQuery: CallbackQuery) {
    super(context);
    this.chatId = callbackQuery.message?.chat.id;
  }

  /** env.send is handled differently to the bot's return value */
  toApiRequest(res: MessageResponse): UpdateResponse {
    if (!this.chatId) {
      throw new Error(
        'Env.send cannot be used because there is no chat id in the callback query',
      );
    }
    return toResponseMethod(res, this.chatId);
  }

  toUpdateRes(res: CallbackResponse) {
    return toAnswerCallbackMethod(res, this.callbackQuery.id);
  }
}
