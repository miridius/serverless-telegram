import { AzureFunction, Context, HttpRequest, Logger } from '@azure/functions';
export { AzureFunction, Context, HttpRequest, Logger };

export type BodyHandler = (body: unknown, log: Logger) => Promise<any | void>;

export interface HttpResponse {
  status?: number;
  body?: any;
  headers?: Record<string, string>;
}

export const isResponse = (r?: any): r is HttpResponse =>
  typeof r === 'object' && ('status' in r || 'body' in r || 'headers' in r);

const toResponse = (output?: any): HttpResponse | undefined => {
  if (!output) return undefined;
  if (isResponse(output)) return output;
  if (typeof output === 'string') return { body: output };
  // Fix for Azure setting the wrong the content type header for json values
  return { body: output, headers: { 'Content-Type': 'application/json' } };
};

export const wrapAzure = (handler: BodyHandler): AzureFunction => async (
  ctx: Context,
  { body }: HttpRequest,
): Promise<HttpResponse | void> =>
  (ctx.res = toResponse(body && (await handler(body, ctx.log))));

export default wrapAzure;
