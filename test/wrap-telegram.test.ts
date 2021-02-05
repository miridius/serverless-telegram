import {
  Chat,
  InlineQuery,
  InlineResponse,
  InlineResult,
  Message,
  MessageEnv,
  MessageHandler,
  MessageResponse,
  ResponseMethod,
  ResponseObject,
  TgApiRequest,
  Update,
} from '../src/wrap-telegram/types';
import wrapTelegram from '../src/wrap-telegram';
import { log, withNockback } from './helpers';
import { createReadStream } from 'fs';
import {
  callTgApi,
  toAnswerInlineMethod,
} from '../src/wrap-telegram/telegram-api';
import { Env } from '../src/wrap-telegram/env';

// Since form boundary is generated randomly we need to make it deterministic
Math.random = jest.fn(() => 0.5);

// TEST DATA

process.env.BOT_API_TOKEN ??= '1111:fake_token';
const chat_id = parseInt(process.env.TEST_CHAT_ID || '') || 2222;

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

const sticker = 'sticker URL';
const stickerResponse: ResponseMethod = {
  method: 'sendSticker',
  chat_id,
  sticker,
};

const video = 'video URL or file ID';
const videoResponse: ResponseMethod = {
  method: 'sendVideo',
  chat_id,
  video,
};

const sendDocument = {
  document: createReadStream(__dirname + '/__fixtures__/test-file.txt'),
  reply_to_message_id: 23,
  reply_markup: {
    inline_keyboard: [[{ text: 'Click me', url: 'https://example.com' }]],
  },
};
const docResponse: ResponseMethod = {
  ...sendDocument,
  method: 'sendDocument',
  chat_id,
};

describe('update handling', () => {
  const echoHandler = wrapTelegram(async ({ text }) => text);

  it('passes messages to the handler and forms the response method', async () => {
    expect(await echoHandler(update, log)).toEqual(responseMethod);
  });

  it('works with message & handlers passed in a map', async () => {
    const handler = wrapTelegram({
      message: ({ text }) => text,
      inline: async ({ query }) => [{ photo_url: query, thumb_url: query }],
    });
    const inlineUpdate: Update = {
      update_id: 2,
      inline_query: {
        id: 'abc',
        query: 'query text',
      } as InlineQuery,
    };
    expect(await handler(update, log)).toEqual(responseMethod);
    expect(await handler(inlineUpdate, log)).toMatchInlineSnapshot(`
      Object {
        "inline_query_id": "abc",
        "method": "answerInlineQuery",
        "results": Array [
          Object {
            "id": "0",
            "photo_url": "query text",
            "thumb_url": "query text",
            "type": "photo",
          },
        ],
      }
    `);
  });

  it("ignores updates that don't contain a message", async () => {
    expect(await echoHandler({ update_id: 1 }, log)).toBeUndefined();
  });

  it('ignores requests that are not a telegram update', async () => {
    expect(await echoHandler(undefined, log)).toBeUndefined();
    expect(await echoHandler(false, log)).toBeUndefined();
    expect(await echoHandler(1, log)).toBeUndefined();
    expect(await echoHandler('', log)).toBeUndefined();
    expect(await echoHandler({}, log)).toBeUndefined();
  });

  it('handles errors', async () => {
    const throwingHandler: MessageHandler = async ({ text }) => {
      throw new Error(text);
    };
    const response = await wrapTelegram(throwingHandler, 123)(update, log);
    expect(response).toHaveProperty('chat_id', 123);
    expect(response).toHaveProperty('method', 'sendMessage');
    expect(response).toHaveProperty('text');

    expect(wrapTelegram(throwingHandler)(update, log)).rejects.toThrow(text);
  });
});

describe('message response parsing', () => {
  const testResponse = (res: MessageResponse) =>
    wrapTelegram(() => res)(update, log);

  it('interprets a string as a text message', () => {
    return expect(testResponse(text)).resolves.toEqual(responseMethod);
  });
  it('sends a text message', () => {
    return expect(testResponse({ text })).resolves.toEqual(responseMethod);
  });
  it('sends a sticker', () => {
    return expect(testResponse({ sticker })).resolves.toEqual(stickerResponse);
  });
  it('sends a video', () => {
    return expect(testResponse({ video })).resolves.toEqual(videoResponse);
  });
  it('sends a local file, with inline keyboard', () => {
    expect.assertions(1);
    return withNockback('sendDocument.json', () =>
      expect(testResponse(sendDocument)).resolves.toBeUndefined(),
    );
  });
  it('throws an error for unknown responses', () => {
    return expect(() =>
      testResponse({ x: 1 } as ResponseObject),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Not a valid message response: {\\"x\\":1}"`,
    );
  });
  it('sends no response', () => {
    return expect(testResponse(undefined)).resolves.toBeUndefined();
  });
});

describe('inline response parsing', () => {
  const queryId = 'q';
  const results: InlineResult[] = [
    {
      type: 'audio',
      id: 'audio-id',
      audio_url: 'foo://bar',
      title: 'baz',
    },
    { photo_url: 'photo URL', thumb_url: 'thumb URL' },
    { latitude: 123, longitude: 456, title: 'home' },
    { title: 'article title', input_message_content: {} },
  ];
  it('works with results array', () => {
    expect(toAnswerInlineMethod(results, queryId)).toMatchSnapshot();
  });
  it('works with answerInlineQuery options', () => {
    const res = { results: [], cache_time: 100000 };
    expect(toAnswerInlineMethod(res, queryId)).toEqual({
      method: 'answerInlineQuery',
      inline_query_id: queryId,
      ...res,
    });
  });
  it('passes through ResponseMethods', () => {
    expect(
      toAnswerInlineMethod({ method: 'sendMessage', chat_id: 1 }, queryId),
    ).toEqual({ method: 'sendMessage', chat_id: 1 });
  });
  it('passes through NoResponse', () => {
    expect(toAnswerInlineMethod(undefined, queryId)).toBeUndefined();
  });
  it('throws errors for unknown response objects', () => {
    expect(() =>
      toAnswerInlineMethod([{}] as InlineResponse, queryId),
    ).toThrowErrorMatchingInlineSnapshot(`"Not a valid inline result: {}"`);
    expect(() =>
      toAnswerInlineMethod({} as InlineResponse, queryId),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Not a valid inline query response: {}"`,
    );
  });
});

describe('Env', () => {
  it('MessageEnv object is passed to message handler', () => {
    expect.assertions(1);
    const handler = (msg: Message, env: MessageEnv) => {
      expect(env).toEqual({
        log: log,
        debug: log.verbose,
        info: log.info,
        warn: log.warn,
        error: log.error,
        update,
        msgOrInline: msg,
        handler,
      });
    };
    return wrapTelegram(handler)(update, log);
  });
  it('supports calling the telegram API', async () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      wrapTelegram(async (_msg, env) =>
        expect(env.send({ action: 'upload_document' })).resolves.toBe(true),
      )(update, log),
    );
  });
  it('ignores NoResponse', () => {
    expect.assertions(1);
    wrapTelegram(async (_msg, env) =>
      expect(env.send()).resolves.toBeUndefined(),
    )(update, log);
  });
  it('ensures toUpdateRes is implemented', () => {
    class TestEnv extends Env<string, void> {
      constructor() {
        super(log, update, 'foo', () => {});
        this.toUpdateRes();
      }
    }
    expect(() => new TestEnv()).toThrowErrorMatchingInlineSnapshot(
      `"toUpdateRes must be implemented by subclass!"`,
    );
  });
});

describe('callTgApi', () => {
  it('ignores empty requests', () => {
    return expect(
      callTgApi((undefined as unknown) as TgApiRequest),
    ).resolves.toBeUndefined();
  });

  it('throws an error if result is not ok', () => {
    expect.assertions(1);
    return withNockback('error.json', () => {
      const badRes = { method: 'sendMessage' } as ResponseMethod;
      return expect(() =>
        callTgApi(badRes),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Telegram API error: Bad Request: message text is empty"`,
      );
    });
  });

  it('throws an error if BOT_API_TOKEN is not set', () => {
    delete process.env.BOT_API_TOKEN;
    return expect(() =>
      callTgApi(docResponse),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"BOT_API_TOKEN environment variable not set!"`,
    );
  });

  it('throws an error when passed a request with no method', () => {
    delete process.env.BOT_API_TOKEN;
    return expect(() =>
      callTgApi(({ foo: 1 } as unknown) as TgApiRequest),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No method in request: {\\"foo\\":1}"`,
    );
  });
});
