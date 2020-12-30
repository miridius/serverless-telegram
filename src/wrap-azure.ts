import { Context, HttpRequest } from '@azure/functions';

export type BodyHandler = (
  body?: HttpRequest['body'],
) => Promise<HttpRequest['body'] | void>;

export default (handler: BodyHandler) => async (
  ctx: Context,
  { body }: HttpRequest,
): Promise<Partial<HttpRequest>> => {
  ctx.log('request body:', body);
  body = body && (await handler(body));
  ctx.log('response body:', body);
  return typeof body === 'string'
    ? { body }
    : body && { body, headers: { 'Content-Type': 'application/json' } };
};
