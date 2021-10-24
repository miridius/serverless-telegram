import {
  Adapter,
  AwsContext,
  AwsHttpFunction,
  AzureContext,
  AzureHttpFunction,
} from '..';

const headers = {
  'Content-Type': 'application/json',
};

export const awsAdapter: Adapter<AwsHttpFunction, AwsContext> = {
  encodeArgs: (body, ctx) => [{ body: JSON.stringify(body) } as any, ctx],
  decodeArgs: ({ body }, ctx) => [body && JSON.parse(body), ctx],
  encodeResponse: (res) => ({
    statusCode: 200,
    headers,
    body: res ? JSON.stringify(res) : '',
  }),
  decodeResponse: ({ body }) => body && JSON.parse(body),
};

export const azureAdapter: Adapter<AzureHttpFunction, AzureContext> = {
  encodeArgs: (body, ctx) => [ctx, { body } as any],
  decodeArgs: (ctx, { body }) => [body, ctx],
  encodeResponse: (res, ctx) =>
    (ctx.res = res ? { body: res, headers } : undefined),
  decodeResponse: (res) => res?.body,
};

export default {
  aws: awsAdapter,
  azure: azureAdapter,
};
