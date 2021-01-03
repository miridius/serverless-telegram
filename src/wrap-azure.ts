export interface HttpRequest {
  body?: unknown;
  headers?: { [key: string]: string };
}

export interface Context {
  log: (...args: any[]) => void;
  res?: HttpRequest;
}

export type BodyHandler = (body: unknown) => Promise<any | void>;

export const wrapAzure = (handler: BodyHandler) => async (
  ctx: Context,
  { body }: HttpRequest,
): Promise<HttpRequest | void> => {
  ctx.log('request body:', body);
  const res = body && (await handler(body));
  ctx.log('response body:', res);
  if (!res) return;
  ctx.res = { body: res };
  if (typeof res !== 'string') {
    ctx.res.headers = { 'Content-Type': 'application/json' };
  }
  return ctx.res;
};

export default wrapAzure;
