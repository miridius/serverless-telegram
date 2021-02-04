import type { Logger } from '../wrap-azure';
import type {
  InlineQuery,
  InlineResponse,
  Message,
  MessageResponse,
  Update,
} from './types';
import {
  callTgApi,
  toAnswerInlineMethod,
  toResponseMethod,
} from './telegram-api';

type Handler<Req, Res> = (req: Req, env: Env<Req, Res>) => Promise<Res> | Res;

export class Env<Req, Res> {
  log: Logger;
  debug: Logger['verbose'];
  info: Logger['info'];
  warn: Logger['warn'];
  error: Logger['error'];

  update: Update;
  req: Req;
  handler: Handler<Req, Res>;

  // let the user add additional properties if they want
  [k: string]: any;

  constructor(
    log: Logger,
    update: Update,
    req: Req,
    handler: Handler<Req, Res>,
  ) {
    this.log = log;
    this.debug = log.verbose;
    this.info = log.info;
    this.warn = log.warn;
    this.error = log.error;

    this.update = update;
    this.req = req;
    this.handler = handler;
  }

  /** Internal method used by serverless-telegram to run the handler */
  protected async execute() {
    return this.toUpdateRes(await this.handler(this.req, this));
  }

  /**
   * Call the Telegram Bot API asynchronously.
   * @param res Object with parameter:value mapping for one of the send* API
   * {@link https://core.telegram.org/bots/api#available-methods|methods}.
   * To upload a file, pass a `fs.ReadStream` (using `fs.createReadStream(path)`)
   * as a parameter value.
   * @returns a promise resolving to the API call result (if any)
   */
  async send(res: Res) {
    return callTgApi(this.toUpdateRes(res));
  }
}

export class MessageEnv extends Env<Message, MessageResponse> {
  protected toUpdateRes(res: MessageResponse) {
    return toResponseMethod(res, this.req.chat.id);
  }
}

export class InlineEnv extends Env<InlineQuery, InlineResponse> {
  protected toUpdateRes(res: InlineResponse) {
    return toAnswerInlineMethod(res, this.req.id);
  }
}
