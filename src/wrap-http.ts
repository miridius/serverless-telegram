import type {
  AwsContext,
  AwsHttpFunction,
  AzureContext,
  AzureHttpFunction,
  AzureHttpResponse,
  BodyHandler,
} from './types';

export const isHttpResponse = (r?: any): r is AzureHttpResponse =>
  typeof r === 'object' && ('status' in r || 'body' in r || 'headers' in r);

const toHttpResponse = (output?: any): AzureHttpResponse | undefined => {
  if (!output) return undefined;
  if (isHttpResponse(output)) return output;
  if (typeof output === 'string') return { body: output };
  // Fix for Azure setting the wrong the content type header for json values
  return { body: output, headers: { 'Content-Type': 'application/json' } };
};

export const wrapAzure = (
  handler: BodyHandler<AzureContext>,
): AzureHttpFunction => async (ctx, { body }) =>
  (ctx.res = toHttpResponse(body && (await handler(body, ctx))));

export const wrapAws = (
  handler: BodyHandler<AwsContext>,
): AwsHttpFunction => async ({ body }, ctx) =>
  (body && (await handler(JSON.parse(body), ctx))) || '';
