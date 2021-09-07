import { Context as AzureContext, HttpRequest, Logger } from '@azure/functions';
import { APIGatewayProxyHandlerV2, Context as AwsContext } from 'aws-lambda';
import { UpdateResponse } from './wrap-telegram/types';
export { AwsContext, AzureContext, HttpRequest, Logger };

export type Context = AwsContext | AzureContext;

export type BodyHandler<R = UpdateResponse, C extends Context = Context> = (
  body: unknown,
  ctx: C,
) => R | Promise<R>;

export interface HttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
}

export type AzureHttpFunction = (
  ctx: AzureContext,
  req: HttpRequest,
) => Promise<HttpResponse | undefined>;

export const isHttpResponse = (r?: any): r is HttpResponse =>
  typeof r === 'object' && ('status' in r || 'body' in r || 'headers' in r);

const toHttpResponse = (output?: any): HttpResponse | undefined => {
  if (!output) return undefined;
  if (isHttpResponse(output)) return output;
  if (typeof output === 'string') return { body: output };
  // Fix for Azure setting the wrong the content type header for json values
  return { body: output, headers: { 'Content-Type': 'application/json' } };
};

export const wrapAzure = (
  handler: BodyHandler<UpdateResponse, AzureContext>,
): AzureHttpFunction => async (ctx, { body }) =>
  (ctx.res = toHttpResponse(body && (await handler(body, ctx))));

export const wrapAws = (
  handler: BodyHandler<UpdateResponse, AwsContext>,
): APIGatewayProxyHandlerV2<UpdateResponse> => async ({ body }, ctx) =>
  (body && (await handler(JSON.parse(body), ctx))) || '';
