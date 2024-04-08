import FormData from 'form-data';
import { createReadStream } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import { request } from 'node:https';
import { AnswerCallbackQueryMethod, CallbackResponse } from '..';
import {
  AnswerInlineQuery,
  INLINE_TYPE_MAPPING,
  InlineQueryResult,
  InlineResponse,
  InlineResult,
  METHOD_MAPPING,
  MessageResponse,
  NoResponse,
  ResponseMethod,
  ResponseObject,
  TgApiRequest,
  UpdateResponse,
  responseFileParams,
} from '../types';
import { isFileBuffer, isFileUrl, isObject, toFileUrl } from '../utils';

export const isNoResponse = (res: unknown): res is NoResponse => !res;

const expandStringRes = <T>(res: string | T): T | { text: string } =>
  typeof res === 'string' ? { text: res } : res;

const getMethod = (res: ResponseObject): ResponseMethod['method'] | undefined =>
  Object.keys(res)
    .map((key) => METHOD_MAPPING[key])
    .filter((method?) => method)[0];

export const toResponseMethod = (
  res: MessageResponse,
  chat_id: number,
): ResponseMethod | undefined => {
  // check for NoResponse
  if (isNoResponse(res)) return undefined;
  // convert string to object
  const resObj = expandStringRes(res);
  // determine the telegram api method from content (if not specified)
  const method = (resObj as ResponseMethod).method || getMethod(resObj);
  if (!method) {
    throw new Error(`Not a valid message response: ${JSON.stringify(res)}`);
  }
  return { method, chat_id, ...resObj };
};

const isAnswerInlineQuery = (res: unknown): res is AnswerInlineQuery =>
  isObject(res) && Array.isArray((res as AnswerInlineQuery).results);

const isResponseMethod = (res: unknown): res is ResponseMethod =>
  typeof res === 'object' && res != null && 'method' in res && 'chat_id' in res;

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
  if (isNoResponse(res) || isResponseMethod(res)) return res;
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

const allowedCbResKeys = new Set(['text', 'show_alert', 'url', 'cache_time']);
const isCallbackResponse = (res: any): res is CallbackResponse =>
  !res ||
  typeof res === 'string' ||
  (typeof res === 'object' &&
    Object.keys(res).every((k) => allowedCbResKeys.has(k)));

export const toAnswerCallbackMethod = (
  res: CallbackResponse,
  callback_query_id: string,
): AnswerCallbackQueryMethod => {
  if (!isCallbackResponse(res)) {
    throw new Error(
      'callback handler must return a callback response, not ' +
        JSON.stringify(res),
    );
  }
  const options = isNoResponse(res) ? {} : expandStringRes(res);
  return { ...options, method: 'answerCallbackQuery', callback_query_id };
};

const getUrl = (method: string) => {
  const token = process.env.BOT_API_TOKEN;
  if (!token) throw new Error('BOT_API_TOKEN environment variable not set!');
  return `https://api.telegram.org/bot${token}/${method}`;
};

const urlOrFileId = /(^https?:\/\/)|(^[\w-]{50,}$)/;

const isFilePathParam = ([k, v]: [string, unknown]) =>
  isFileUrl(v) ||
  (responseFileParams.has(k) && typeof v === 'string' && !v.match(urlOrFileId));

const encodeParamVal = (k: string, v: unknown) =>
  isFilePathParam([k, v])
    ? createReadStream(toFileUrl(v as string))
    : isObject(v)
      ? JSON.stringify(v)
      : v;

const append = (form: FormData, k: string, v: unknown) => {
  if (isFileBuffer(v)) {
    const { buffer, ...appendOpts } = v;
    form.append(k, buffer, appendOpts);
  } else {
    form.append(k, encodeParamVal(k, v));
  }
};

const createForm = (params: Record<string, any>) => {
  const form = new FormData();
  Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .forEach(([k, v]) => append(form, k, v));
  return form;
};

export const hasFileParams = (params: Record<string, any>) =>
  Object.entries(params).some(
    ([k, v]) => isFileBuffer(v) || isFilePathParam([k, v]),
  );

export const postAsync = (
  url: string,
  params: Record<string, any>,
  useForm?: boolean,
): Promise<IncomingMessage> =>
  new Promise((resolve, reject) => {
    if (useForm || hasFileParams(params)) {
      createForm(params).submit(url, (err, res) => resolve(res));
    } else {
      const body = JSON.stringify(params);
      const opts = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      };
      const req = request(url, opts, resolve).on('error', reject);
      req.write(body);
      req.end();
    }
  });

const toJsonAsync = (res: IncomingMessage): Promise<any> =>
  new Promise((resolve, reject): void => {
    let body = '';
    res.on('data', (s) => (body += s));
    res.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(new Error(`Telegram API returned bad JSON: "${body}"`));
      }
    });
  });

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
export const callTgApi = async (req: TgApiRequest, useForm?: boolean) => {
  if (!req) return;
  const { method, ...params } = req;
  if (!method) throw new Error(`No method in request: ${JSON.stringify(req)}`);
  const res = await postAsync(getUrl(method), params, useForm);
  const json = await toJsonAsync(res);
  if (!json.ok) throw new Error(`Telegram API error: ${json.description}`);
  return json.result;
};
