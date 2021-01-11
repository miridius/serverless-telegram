import { Chat, Message, Update } from 'node-telegram-bot-api';
import { HttpResponse } from '../src/wrap-azure';
import wrapTelegram, {
  getMessage,
  MessageHandler,
  strToObj,
  ResponseMethod,
  toMethod,
} from '../src/wrap-telegram';
import ctx from './defaultContext';

const chat_id = 3;
const chat: Chat = {
  id: chat_id,
  type: 'private',
};

const text = 'Hello World!';

const message: Message = {
  message_id: 2,
  chat,
  text,
  date: 123,
};

const update: Update = {
  update_id: 1,
  message,
};

const responseMethod: ResponseMethod = {
  method: 'sendMessage',
  chat_id,
  text,
};

const media = ['url1', 'url2'];

const mediaResponse: ResponseMethod = {
  method: 'sendMediaGroup',
  chat_id,
  media,
};

const sticker = 'sticker URL';
const stickerResponse: ResponseMethod = {
  method: 'sendSticker',
  chat_id,
  sticker,
};

describe('getMessage', () => {
  it('gets message from an update', () => {
    expect(getMessage(update)).toEqual(message);
  });
  it('ignores non-message updates', () => {
    expect(getMessage({ update_id: 1 })).toBeFalsy();
  });
});

describe('normalizeResponse', () => {
  it('converts a string', () => {
    expect(strToObj(text)).toEqual({ text });
  });
  it('ignores an object', () => {
    expect(strToObj({ text })).toEqual({ text });
    expect(strToObj({ media })).toEqual({ media });
  });
  it('ignores undefined', () => {
    expect(strToObj()).toBeUndefined();
  });
});

describe('toMethod', () => {
  it('sends a text message', () => {
    expect(toMethod({ text }, chat_id)).toEqual(responseMethod);
  });
  it('sends a media group', () => {
    expect(toMethod({ media }, chat_id)).toEqual(mediaResponse);
  });
  it('sends a sticker', () => {
    expect(toMethod({ sticker }, chat_id)).toEqual(stickerResponse);
  });
  it('sends no response', () => {
    expect(toMethod(undefined, chat_id)).toBeUndefined();
  });
  it('returns user defined HTTP responses as is', () => {
    let res: HttpResponse = { body: Buffer.from('this is a buffer') };
    expect(toMethod(res, chat_id)).toEqual(res);
  });
});

describe('wrapTelegram', () => {
  const echoHandler = wrapTelegram(async ({ text }) => text);

  it('passes messages to the handler and forms the response method', async () => {
    expect(await echoHandler(update, ctx.log)).toEqual(responseMethod);
  });

  it("ignores updates that don't contain a message", async () => {
    expect(await echoHandler({ update_id: 1 }, ctx.log)).toBeUndefined();
  });

  it('handles errors', async () => {
    const throwingHandler: MessageHandler = async ({ text }) => {
      throw new Error(text);
    };
    const response = await wrapTelegram(throwingHandler, 123)(update, ctx.log);
    expect(response).toHaveProperty('chat_id', 123);
    expect(response).toHaveProperty('method', 'sendMessage');
    expect(response).toHaveProperty('text');

    expect(wrapTelegram(throwingHandler)(update, ctx.log)).rejects.toThrow(
      text,
    );
  });
});
