import {
  AnswerInlineQuery,
  INLINE_TYPE_MAPPING,
  InlineQueryResult,
  InlineResponse,
  InlineResult,
  MessageResponse,
  METHOD_MAPPING,
  NoResponse,
  ResponseMethod,
  ResponseObject,
  TgApiRequest,
  UpdateResponse,
} from './types';
import { ReadStream } from 'fs';
import fetch, { RequestInit } from 'node-fetch';
import FormData from 'form-data';

const getMethod = (res: ResponseObject): ResponseMethod['method'] | undefined =>
  Object.keys(res)
    .map((key) => METHOD_MAPPING[key])
    .filter((method?) => method)[0];

export const toResponseMethod = (
  res: MessageResponse,
  chat_id: number,
): ResponseMethod | undefined => {
  // check for NoResponse
  if (!res) return undefined;
  // convert string to object
  const resObj = typeof res === 'string' ? { text: res } : res;
  // determine the telegram api method from content (if not specified)
  const method = (resObj as ResponseMethod).method || getMethod(resObj);
  if (!method) {
    throw new Error(`Not a valid message response: ${JSON.stringify(res)}`);
  }
  return { method, chat_id, ...resObj };
};

const isObject = (x: unknown): x is Exclude<object, null> =>
  typeof x === 'object' && x !== null;

const isAnswerInlineQuery = (res: unknown): res is AnswerInlineQuery =>
  isObject(res) && Array.isArray((res as AnswerInlineQuery).results);

const isPassthroughResponse = (
  res: InlineResponse,
): res is ResponseMethod | NoResponse =>
  !res || ('method' in res && 'chat_id' in res);

// special cases where there's no unique mandatory parameter
const resultTypeExceptions = (
  res: InlineResult,
): InlineResult['type'] | undefined => {
  if ('latitude' in res) return 'location';
  if ('title' in res && 'input_message_content' in res) return 'article';
  return undefined;
};

const getInlineQueryResultType = (res: InlineResult): InlineResult['type'] =>
  res.type ||
  Object.keys(res)
    .map((k) => INLINE_TYPE_MAPPING[k as keyof InlineResult])
    .filter((t?) => t)[0] ||
  resultTypeExceptions(res);

export const toInlineQueryResult = (
  res: InlineResult,
  i: number,
): InlineQueryResult => {
  const type = getInlineQueryResultType(res);
  if (!type) {
    throw new Error(`Not a valid inline result: ${JSON.stringify(res)}`);
  }
  return { id: i.toString(), type, ...res } as InlineQueryResult;
};

export const toAnswerInlineMethod = (
  res: InlineResponse,
  inline_query_id: string,
): UpdateResponse => {
  if (isPassthroughResponse(res)) return res;
  if (Array.isArray(res)) res = { results: res };
  if (!isAnswerInlineQuery(res)) {
    throw new Error(
      `Not a valid inline query response: ${JSON.stringify(res)}`,
    );
  }
  return {
    method: 'answerInlineQuery',
    inline_query_id,
    ...res,
    results: res.results.map(toInlineQueryResult),
  };
};

const getUrl = (method: string) => {
  const token = process.env.BOT_API_TOKEN;
  if (!token) throw new Error('BOT_API_TOKEN environment variable not set!');
  return `https://api.telegram.org/bot${token}/${method}`;
};

export const hasFileParams = (params: Record<string, any>) =>
  Object.values(params).some((v) => v instanceof ReadStream);

const encodeParamVal = (v: any) =>
  typeof v === 'object' && !(v instanceof ReadStream) ? JSON.stringify(v) : v;

const createForm = (params: Record<string, any>) => {
  const form = new FormData();
  Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .forEach(([k, v]) => form.append(k, encodeParamVal(v)));
  return form;
};

const getOpts = (params: Record<string, any>, useForm?: boolean) => {
  const opts: RequestInit = { method: 'post' };
  if (useForm ?? hasFileParams(params)) {
    opts.body = createForm(params);
  } else {
    opts.body = JSON.stringify(params);
    opts.headers = { 'content-type': 'application/json' };
  }
  return opts;
};

/**
 * Call the Telegram Bot API asynchronously. For most cases it is simpler
 * to use Env.send() as that will automatically set the method and chat_id.
 * @param req Object containing a `method` key which names the telegram API
 * {@link https://core.telegram.org/bots/api#available-methods|method},
 * along with any other parameters. To upload a file, pass a `fs.ReadStream`
 * (using `fs.createReadStream(path)`) as the parameter value.
 * @param useForm force sending using a multi-part form. If not set, it will be
 * automatically decided depending on whether any params are `ReadStream`s.
 * @returns a promise resolving to the API call result (if any)
 */
export const callTgApi = async (req?: TgApiRequest, useForm?: boolean) => {
  if (!req) return;
  const { method, ...params } = req;
  const res = await fetch(getUrl(method), getOpts(params, useForm));
  const json = await res.json();
  if (!json.ok) throw new Error(`Telegram API error: ${json.description}`);
  return json.result;
};
