import type { AzureHttpRequest, AzureHttpResponse } from '../src';
import { wrapAws, wrapAzure } from '../src';
import { awsCtx, azureCtx } from './helpers';

const jsonObj = {
  message: { text: 'more good things please', chat: { id: 1 } },
};

const jsonRequest: AzureHttpRequest = {
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

const stringRequest: AzureHttpRequest = {
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

const emptyRequest: AzureHttpRequest = {
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
  const echo = wrapAzure(async (x: any) => x);

  it('handles JSON objects', () => {
    return expect(echo(azureCtx, jsonRequest)).resolves.toEqual({
      body: jsonObj,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('works with plain strings', () => {
    return expect(echo(azureCtx, stringRequest)).resolves.toEqual({
      body: 'text body',
    });
  });

  it('ignores empty body', () => {
    return expect(echo(azureCtx, emptyRequest)).resolves.toBeUndefined();
  });

  it('passes through user defined HTTP responses', () => {
    let res: AzureHttpResponse = { status: 204, headers: { bar: 'baz' } };
    // deep copy in case the response object is modified
    const returnsRes = wrapAzure(async () => JSON.parse(JSON.stringify(res)));
    return expect(returnsRes(azureCtx, jsonRequest)).resolves.toEqual(res);
  });

  it('sets ctx.res as well as the return value', async () => {
    const returnVal = await echo(azureCtx, stringRequest);
    expect(azureCtx.res).toEqual(returnVal);
  });
});

describe('wrapAws', () => {
  const echo = wrapAws(async (x: any) => x);

  it('parses Json', () => {
    return expect(
      echo({ body: JSON.stringify(jsonObj) } as any, awsCtx),
    ).resolves.toEqual(jsonObj);
  });

  it('ignores empty body and returns empty string instead of undefined', () => {
    return expect(echo({} as any, awsCtx)).resolves.toEqual('');
  });
});
