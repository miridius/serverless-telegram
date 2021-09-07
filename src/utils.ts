import { resolve } from 'path';
import { URL } from 'url';
import { callTgApi } from './wrap-telegram/telegram-api';
import type { FileBuffer, SetWebHookOptions } from './wrap-telegram/types';

export const debugAndReturn = (label: string) => <T>(x: T) => (
  console.debug(label + ':', x), x
);

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

const removeFalsyProps = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as Partial<T>;

export const setWebhook = async (opts: SetWebHookOptions) => {
  opts = removeFalsyProps(opts) as SetWebHookOptions;

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

  console.info('Successfully updated webhook');
  return res;
};

export const deleteWebhook = async () => {
  console.debug('Deleting webhook:');
  const res = await callTgApi({ method: 'deleteWebhook' });
  console.debug(res);
  if (res !== true) {
    throw new Error(`Delete webhook failed - API responded with ${res}`);
  }

  console.debug('Getting webhook info:');
  const webhookInfo = await callTgApi({ method: 'getWebhookInfo' });
  console.debug(webhookInfo);

  if (webhookInfo.url) {
    throw new Error(
      `Delete webhook failed - url is still set to ${webhookInfo.url}`,
    );
  }

  console.info('Successfully deleted webhook');
  return webhookInfo;
};
