import type { Logger } from '../wrap-azure';
import type {
  Handler,
  InlineQuery,
  InlineResponse,
  Message,
  MessageResponse,
  Update,
  UpdateResponse,
} from './types';
import {
  callTgApi,
  toAnswerInlineMethod,
  toResponseMethod,
} from './telegram-api';

export class Env<T, R> {
  log: Logger;
  debug: Logger['verbose'];
  info: Logger['info'];
  warn: Logger['warn'];
  error: Logger['error'];

  update: Update;
  msgOrInline: T;
  handler: Handler<T, any, R>;

  // let the user add additional properties if they want
  [k: string]: any;

  constructor(
    log: Logger,
    update: Update,
    req: T,
    handler: Handler<T, any, R>,
  ) {
    this.log = log;
    this.debug = log.verbose;
    this.info = log.info;
    this.warn = log.warn;
    this.error = log.error;

    this.update = update;
    this.msgOrInline = req;
    this.handler = handler;
  }

  /** Internal method used by serverless-telegram to run the handler */
  protected async execute() {
    return this.toUpdateRes(await this.handler(this.msgOrInline, this));
  }

  /**
   * Call the Telegram Bot API asynchronously *during* handler execution, as an
   * alternative to simply returning it from the handler. See `README.md`.
   * @param res Any of the allowable response types from the current handler
   * (i.e. `MessageResponse` or `InlineResponse`)
   * @returns a promise resolving to the API call result (if any)
   */
  async send(res: R) {
    const req = this.toUpdateRes(res);
    return req && callTgApi(req);
  }

  protected toUpdateRes(_res: R): UpdateResponse {
    throw new Error('toUpdateRes must be implemented by subclass!');
  }
}

export class MessageEnv extends Env<Message, MessageResponse> {
  protected toUpdateRes(res: MessageResponse) {
    return toResponseMethod(res, this.msgOrInline.chat.id);
  }
}

export class InlineEnv extends Env<InlineQuery, InlineResponse> {
  protected toUpdateRes(res: InlineResponse) {
    return toAnswerInlineMethod(res, this.msgOrInline.id);
  }
}
