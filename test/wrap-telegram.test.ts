import fs from 'fs';
import { Env, InlineEnv, MessageEnv } from '../src';
import { toFileUrl } from '../src/utils';
import wrapTelegram from '../src/wrap-telegram';
import {
  callTgApi,
  toAnswerInlineMethod,
} from '../src/wrap-telegram/telegram-api';
import type {
  Chat,
  InlineQuery,
  InlineResponse,
  InlineResult,
  Message,
  MessageHandler,
  MessageResponse,
  ResponseMethod,
  ResponseObject,
  TgApiRequest,
  Update,
} from '../src/wrap-telegram/types';
import { ctx, withNockback } from './helpers';

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

const video = 'http://example.com';
const videoResponse: ResponseMethod = {
  method: 'sendVideo',
  chat_id,
  video,
};

const docPath = __dirname + '/__fixtures__/test-file.txt';
const sendDocument = {
  document: toFileUrl(docPath),
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

const queryId = 'q';
const inlineQuery: InlineQuery = { id: queryId, query: 'foo' } as InlineQuery;
const inlineUpdate: Update = { update_id: 1, inline_query: inlineQuery };

describe('update handling', () => {
  const echoHandler = wrapTelegram(async ({ text }) => text);

  it('passes messages to the handler and forms the response method', async () => {
    expect(await echoHandler(update, ctx)).toEqual(responseMethod);
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
    expect(await handler(update, ctx)).toEqual(responseMethod);
    expect(await handler(inlineUpdate, ctx)).toMatchInlineSnapshot(`
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
    expect(await echoHandler({ update_id: 1 }, ctx)).toBeUndefined();
  });

  it('ignores requests that are not a telegram update', async () => {
    expect(await echoHandler(undefined, ctx)).toBeUndefined();
    expect(await echoHandler(false, ctx)).toBeUndefined();
    expect(await echoHandler(1, ctx)).toBeUndefined();
    expect(await echoHandler('', ctx)).toBeUndefined();
    expect(await echoHandler({}, ctx)).toBeUndefined();
  });

  it('handles errors', async () => {
    const throwingHandler: MessageHandler = async ({ text }) => {
      throw new Error(text);
    };
    const response = await wrapTelegram(throwingHandler, 123)(update, ctx);
    expect(response).toHaveProperty('chat_id', 123);
    expect(response).toHaveProperty('method', 'sendMessage');
    expect(response).toHaveProperty('text');

    expect(wrapTelegram(throwingHandler)(update, ctx)).rejects.toThrow(text);
  });
});

describe('message response parsing', () => {
  const testResponse = (res: MessageResponse) =>
    wrapTelegram(() => res)(update, ctx);

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
    return withNockback('sendDocument.json', () =>
      expect(testResponse(sendDocument)).resolves.toBeUndefined(),
    );
  });
  it('understands file URL strings', () => {
    return withNockback('sendDocument.json', () =>
      expect(
        testResponse({ ...sendDocument, document: `file://${docPath}` }),
      ).resolves.toBeUndefined(),
    );
  });
  it('supports sending files as buffers', () => {
    return withNockback('sendDocument.json', () =>
      expect(
        testResponse({
          ...sendDocument,
          document: {
            buffer: fs.readFileSync(docPath),
            filename: 'test-file.txt',
          },
        }),
      ).resolves.toBeUndefined(),
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

describe('MessageEnv', () => {
  it('is passed to message handler with correct properties', async () => {
    expect.assertions(2);
    const handler = (msg: Message, env: MessageEnv) => {
      expect(msg).toEqual(message);
      expect(env).toEqual({
        context: ctx,
        debug: ctx.log.verbose,
        info: ctx.log.info,
        warn: ctx.log.warn,
        error: ctx.log.error,
        message,
      });
    };
    await wrapTelegram(handler)(update, ctx);
  });

  it('supports calling the telegram API', () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      expect(
        new MessageEnv(ctx, message).send({ action: 'upload_document' }),
      ).resolves.toBe(true),
    );
  });
});

describe('InlineEnv', () => {
  it('is passed to inline query handler with correct properties', async () => {
    expect.assertions(2);
    const handler = (iq: InlineQuery, env: InlineEnv) => {
      expect(iq).toEqual(inlineQuery);
      expect(env).toEqual({
        context: ctx,
        debug: ctx.log.verbose,
        info: ctx.log.info,
        warn: ctx.log.warn,
        error: ctx.log.error,
        inlineQuery,
      });
    };
    await wrapTelegram({ inline: handler })(inlineUpdate, ctx);
  });

  it('supports calling the telegram API', () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      expect(
        new InlineEnv(ctx, inlineQuery).send({
          method: 'sendChatAction',
          chat_id: chat_id,
          action: 'upload_document',
        }),
      ).resolves.toBe(true),
    );
  });
});

describe('Env', () => {
  it('ignores NoResponse', () => {
    expect.assertions(1);
    wrapTelegram(async (_msg, env) =>
      expect(env.send()).resolves.toBeUndefined(),
    )(update, ctx);
  });

  it('ensures toUpdateRes is implemented', () => {
    expect(() =>
      new Env(ctx).toUpdateRes(responseMethod),
    ).toThrowErrorMatchingInlineSnapshot(
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
