import { AzureFunction, Context, HttpRequest, Logger } from '@azure/functions';
export { AzureFunction, Context, HttpRequest, Logger };

export type BodyHandler = (body: unknown, log: Logger) => Promise<any | void>;

export const wrapAzure = (handler: BodyHandler): AzureFunction => async (
  ctx: Context,
  { body }: HttpRequest,
): Promise<Partial<HttpRequest> | void> => {
  const res = body && (await handler(body, ctx.log));
  if (!res) return;
  ctx.res = { body: res };
  if (typeof res !== 'string') {
    ctx.res.headers = { 'Content-Type': 'application/json' };
  }
  return ctx.res;
};

export default wrapAzure;
