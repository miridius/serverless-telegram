import { HttpRequest } from '@azure/functions';
import { ctx } from './helpers';
import wrapAzure, { HttpResponse } from '../src/wrap-azure';

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

describe('wrapAzure', () => {
  const echo = wrapAzure(async (_, x: any) => x);

  it('handles JSON objects', () => {
    return expect(echo(ctx, jsonRequest)).resolves.toEqual({
      body: jsonObj,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('works with plain strings', () => {
    return expect(echo(ctx, stringRequest)).resolves.toEqual({
      body: 'text body',
    });
  });

  it('ignores empty body', () => {
    return expect(echo(ctx, emptyRequest)).resolves.toBeUndefined();
  });

  it('passes through user defined HTTP responses', () => {
    let res: HttpResponse = { status: 204, headers: { bar: 'baz' } };
    // deep copy in case the response object is modified
    const returnsRes = wrapAzure(async () => JSON.parse(JSON.stringify(res)));
    return expect(returnsRes(ctx, jsonRequest)).resolves.toEqual(res);
  });

  it('sets ctx.res as well as the return value', async () => {
    const returnVal = await echo(ctx, stringRequest);
    expect(ctx.res).toEqual(returnVal);
  });
});
