import { awsAdapter, azureAdapter, AzureHttpRequest, wrapHttp } from '../src';
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

describe('wrapHttp with azureAdapter', () => {
  const echo = wrapHttp(async (x: any) => x, azureAdapter);

  it('handles JSON objects', () => {
    return expect(echo(azureCtx, jsonRequest)).resolves.toEqual({
      body: jsonObj,
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('ignores empty body', () => {
    return expect(echo(azureCtx, emptyRequest)).resolves.toBeUndefined();
  });

  it('sets ctx.res as well as the return value', async () => {
    const returnVal = await echo(azureCtx, stringRequest);
    expect(azureCtx.res).toEqual(returnVal);
  });
});

describe('wrapHttp with awsAdapter', () => {
  const echo = wrapHttp(async (x: any) => x, awsAdapter);

  it('parses JSON input and stringifies JSON output', () => {
    let body = JSON.stringify(jsonObj);
    return expect(echo({ body } as any, awsCtx)).resolves.toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body,
    });
  });

  it('ignores empty body in input and returns an empty body in output', () => {
    return expect(echo({} as any, awsCtx)).resolves.toEqual({
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: '',
    });
  });
});
