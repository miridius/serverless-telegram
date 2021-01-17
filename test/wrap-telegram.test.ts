import {
  Chat,
  InlineQuery,
  InlineQueryResult,
  Message,
  Update,
} from 'node-telegram-bot-api';
import { HttpResponse } from '../src/wrap-azure';
import wrapTelegram, {
  getMessage,
  MessageHandler,
  strToObj,
  ResponseMethod,
  toMethod,
  ResponseObject,
  toInlineResponse,
  InlineResult,
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

const media = ['url1', 'url2'];
const mediaResponse: ResponseMethod = {
  method: 'sendMediaGroup',
  chat_id,
  media,
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
  it('returns user defined HTTP responses as is', () => {
    let res: HttpResponse = { body: Buffer.from('this is a buffer') };
    expect(toMethod(res, chat_id)).toEqual(res);
  });
  it('sends a text message', () => {
    expect(toMethod({ text }, chat_id)).toEqual(responseMethod);
  });
  it('sends a sticker', () => {
    expect(toMethod({ sticker }, chat_id)).toEqual(stickerResponse);
  });
  it('sends a video', () => {
    expect(toMethod({ video }, chat_id)).toEqual(videoResponse);
  });
  it('sends a media group', () => {
    expect(toMethod({ media }, chat_id)).toEqual(mediaResponse);
  });
  it('throws an error for unknown responses', () => {
    expect(() => toMethod({ foo: 'bar' } as ResponseObject, chat_id)).toThrow(
      'Could not parse response: {"foo":"bar"}',
    );
  });
  it('sends no response', () => {
    expect(toMethod(undefined, chat_id)).toBeUndefined();
  });
});

describe('toInlineResponse', () => {
  const queryId = 'q';
  const results: (InlineResult | InlineQueryResult)[] = [
    {
      type: 'audio',
      id: 'audio-id',
      audio_url: 'foo://bar',
      title: 'baz',
    },
    { photo_url: 'photo URL', thumb_url: 'thumb URL' },
    { video_file_id: 'video file ID', title: 'video title' },
  ];
  it('works with results array', () => {
    expect(toInlineResponse(results, queryId)).toMatchInlineSnapshot(`
      Object {
        "inline_query_id": "q",
        "method": "answerInlineQuery",
        "results": Array [
          Object {
            "audio_url": "foo://bar",
            "id": "audio-id",
            "title": "baz",
            "type": "audio",
          },
          Object {
            "id": "1",
            "photo_url": "photo URL",
            "thumb_url": "thumb URL",
            "type": "photo",
          },
          Object {
            "id": "2",
            "title": "video title",
            "type": "video",
            "video_file_id": "video file ID",
          },
        ],
      }
    `);
  });
  it('works with answerInlineQuery options', () => {
    expect(toInlineResponse({ results, cache_time: 100000 }, queryId))
      .toMatchInlineSnapshot(`
      Object {
        "cache_time": 100000,
        "inline_query_id": "q",
        "method": "answerInlineQuery",
        "results": Array [
          Object {
            "audio_url": "foo://bar",
            "id": "audio-id",
            "title": "baz",
            "type": "audio",
          },
          Object {
            "id": "1",
            "photo_url": "photo URL",
            "thumb_url": "thumb URL",
            "type": "photo",
          },
          Object {
            "id": "2",
            "title": "video title",
            "type": "video",
            "video_file_id": "video file ID",
          },
        ],
      }
    `);
  });
  it('passes through HttpResponse and NoResponse', () => {
    expect(toInlineResponse({ status: 200 }, queryId)).toEqual({ status: 200 });
    expect(toInlineResponse(undefined, queryId)).toBeUndefined();
  });
  it('throws errors for unknown response objects', () => {
    expect(() =>
      toInlineResponse([{}], queryId),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Could not determine InlineQueryResult type of {}"`,
    );
    expect(() =>
      toInlineResponse({}, queryId),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Response should either be an array of results or contain a results array: {}"`,
    );
  });
});

describe('wrapTelegram', () => {
  const echoHandler = wrapTelegram(async ({ text }) => text);

  it('passes messages to the handler and forms the response method', async () => {
    expect(await echoHandler(update, ctx.log)).toEqual(responseMethod);
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
    expect(await handler(update, ctx.log)).toEqual(responseMethod);
    expect(await handler(inlineUpdate, ctx.log)).toMatchInlineSnapshot(`
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
    expect(await echoHandler({ update_id: 1 }, ctx.log)).toBeUndefined();
  });

  it('ignores requests that are not a telegram update', async () => {
    expect(await echoHandler(undefined, ctx.log)).toBeUndefined();
    expect(await echoHandler(false, ctx.log)).toBeUndefined();
    expect(await echoHandler(1, ctx.log)).toBeUndefined();
    expect(await echoHandler('', ctx.log)).toBeUndefined();
    expect(await echoHandler({}, ctx.log)).toBeUndefined();
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
