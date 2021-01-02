export interface HttpRequest {
  body?: unknown;
  headers?: { [key: string]: string };
}

export interface Context {
  log: (...args: any[]) => void;
}

export type BodyHandler = (body: unknown) => Promise<any | void>;

export const wrapAzure = (handler: BodyHandler) => async (
  { log }: Context,
  { body }: HttpRequest,
): Promise<HttpRequest | void> => {
  log('request body:', body);
  const res = body && (await handler(body));
  log('response body:', res);
  return typeof res === 'string'
    ? { body: res }
    : res && { body: res, headers: { 'Content-Type': 'application/json' } };
};

export default wrapAzure;
