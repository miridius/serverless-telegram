import fs from 'fs';
import {
  InlineQuery,
  MessageHandler,
  MessageResponse,
  ResponseObject,
  Update,
} from '../../src';
import wrapTelegram from '../../src/telegram/wrap-telegram';
import { azureCtx, withNockback } from '../helpers';
import {
  docPath,
  responseMethod,
  sendDocument,
  sticker,
  stickerResponse,
  text,
  update,
  video,
  videoResponse,
} from './test-data';

// Since form boundary is generated randomly we need to make it deterministic
Math.random = jest.fn(() => 0.5);

describe('update handling', () => {
  const echoHandler = wrapTelegram(async ({ text }) => text);

  it('passes messages to the handler and forms the response method', async () => {
    expect(await echoHandler(update, azureCtx)).toEqual(responseMethod);
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
    expect(await handler(update, azureCtx)).toEqual(responseMethod);
    expect(await handler(inlineUpdate, azureCtx)).toMatchInlineSnapshot(`
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
    expect(await echoHandler({ update_id: 1 }, azureCtx)).toBeUndefined();
  });

  it('ignores requests that are not a telegram update', async () => {
    expect(await echoHandler(undefined, azureCtx)).toBeUndefined();
    expect(await echoHandler(false, azureCtx)).toBeUndefined();
    expect(await echoHandler(1, azureCtx)).toBeUndefined();
    expect(await echoHandler('', azureCtx)).toBeUndefined();
    expect(await echoHandler({}, azureCtx)).toBeUndefined();
  });

  it('handles errors', async () => {
    const throwingHandler: MessageHandler = async ({ text }) => {
      throw new Error(text);
    };
    const response = await wrapTelegram(throwingHandler, 123)(update, azureCtx);
    expect(response).toHaveProperty('chat_id', 123);
    expect(response).toHaveProperty('method', 'sendMessage');
    expect(response).toHaveProperty('text');

    expect(wrapTelegram(throwingHandler)(update, azureCtx)).rejects.toThrow(
      text,
    );
  });
});

describe('message response parsing', () => {
  const testResponse = (res: MessageResponse) =>
    wrapTelegram(() => res)(update, azureCtx);

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
