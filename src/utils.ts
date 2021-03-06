import type { FileBuffer } from './wrap-telegram/types';
import { SetWebHookOptions } from 'node-telegram-bot-api';
import { resolve } from 'path';
import { URL } from 'url';
import { callTgApi } from './wrap-telegram/telegram-api';

export const isObject = (x: unknown): x is Exclude<object, null> =>
  typeof x === 'object' && x !== null;

export const isFileBuffer = (v: unknown): v is FileBuffer =>
  isObject(v) &&
  Buffer.isBuffer((v as FileBuffer).buffer) &&
  typeof (v as FileBuffer).filename === 'string';

export const isFileUrl = (v: unknown): v is URL =>
  v instanceof URL && v.protocol === 'file:';

export const toFileUrl = (filePath: string | URL) => {
  if (filePath instanceof URL) return filePath;
  if (!filePath.startsWith('file:/')) filePath = `file://${resolve(filePath)}`;
  return new URL(filePath);
};

const removeFalsyProps = (obj: object) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v));

export const setWebhook = async (opts: SetWebHookOptions) => {
  opts = removeFalsyProps(opts);

  console.debug('Setting webhook:', opts);
  await callTgApi({ method: 'setWebhook', ...opts });

  console.debug('Getting webhook info:');
  const res = await callTgApi({ method: 'getWebhookInfo' });
  console.debug(res);

  Object.entries(opts).forEach(([opt, expected]) => {
    const ok = Array.isArray(expected)
      ? expected.every((ex, i) => res[opt][i] === ex)
      : res[opt] === expected;
    if (!ok) {
      throw new Error(`Webhook update failed - ${opt}s don't match!`);
    }
  });
};
