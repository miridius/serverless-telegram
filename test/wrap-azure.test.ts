import { HttpRequest } from '@azure/functions';
import ctx from './defaultContext';
import wrapAzure from '../src/wrap-azure';

const jsonObj = {
  message: { text: 'more good things please', chat: { id: 1 } },
};

const jsonRequest: HttpRequest = {
  method: 'POST',
  url: 'http://localhost:7071/api/telegram-webhook',
  headers: {
    'content-type': 'application/json',
    accept: '*/*',
    host: 'localhost:7071',
    'user-agent': 'insomnia/2020.5.2',
    'content-length': '62',
  },
  query: {},
  params: {},
  body: jsonObj,
  rawBody: '{"message":{"text":"more good things please","chat":{"id":1}}}',
};

const stringRequest: HttpRequest = {
  method: 'POST',
  url: 'http://localhost:7071/api/telegram-webhook',
  headers: {
    accept: '*/*',
    host: 'localhost:7071',
    'user-agent': 'insomnia/2020.5.2',
    'content-length': '9',
  },
  query: {},
  params: {},
  body: 'text body',
  rawBody: 'text body',
};

const emptyRequest: HttpRequest = {
  method: 'POST',
  url: 'http://localhost:7071/api/telegram-webhook',
  headers: {
    accept: '*/*',
    host: 'localhost:7071',
    'user-agent': 'insomnia/2020.5.2',
    'content-length': '0',
  },
  query: {},
  params: {},
  body: undefined,
  rawBody: undefined,
};

// note: we use async/await because Jest's .resolves does not fail the tests.
describe('wrapAzure', () => {
  const echo = wrapAzure(async (x: any) => x);
  it('handles JSON objects', async () => {
    expect(await echo(ctx, jsonRequest)).toEqual({
      body: jsonObj,
      headers: { 'Content-Type': 'application/json' },
    });
  });
  it('works with plain strings', async () => {
    expect(await echo(ctx, stringRequest)).toEqual({ body: 'text body' });
  });
  it('ignores empty body', async () => {
    expect(await echo(ctx, emptyRequest)).toBeUndefined();
  });
});
