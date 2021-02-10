import { Context, HttpRequest, Logger } from '@azure/functions';
export { Context, HttpRequest, Logger };

export type BodyHandler<T = any> = (
  ctx: Context,
  body: unknown,
) => T | Promise<T>;

export interface HttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
}

export type AzureHttpFunction = (
  ctx: Context,
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

export const wrapAzure = (handler: BodyHandler): AzureHttpFunction => async (
  ctx: Context,
  { body }: HttpRequest,
): Promise<HttpResponse | undefined> => {
  const res = toHttpResponse(body && (await handler(ctx, body)));
  return (ctx.res ||= res);
};

export default wrapAzure;
