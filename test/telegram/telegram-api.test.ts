import type {
  InlineResponse,
  InlineResult,
  ResponseMethod,
  TgApiRequest,
} from '../../src';
import {
  callTgApi,
  toAnswerInlineMethod,
} from '../../src/telegram/telegram-api';
import { withNockback } from '../helpers';
import { docResponse, queryId } from './test-data';

describe('toAnswerInlineMethod', () => {
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

describe('callTgApi', () => {
  it('ignores empty requests', () => {
    return expect(
      callTgApi(undefined as unknown as TgApiRequest),
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

  it('throws an error if response is not valid JSON', () => {
    expect.assertions(1);
    return withNockback('invalidJson.json', () => {
      const badRes = { method: 'sendMessage' } as ResponseMethod;
      return expect(() =>
        callTgApi(badRes),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Telegram API returned bad JSON: "Internal server error""`,
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
      callTgApi({ foo: 1 } as unknown as TgApiRequest),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"No method in request: {"foo":1}"`,
    );
  });
});
