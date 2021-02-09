import { resolve } from 'path';
import { URL } from 'url';

export const isObject = (x: unknown): x is Exclude<object, null> =>
  typeof x === 'object' && x !== null;

export const isFileUrl = (v: unknown): v is URL =>
  v instanceof URL && v.protocol === 'file:';

export const toFileUrl = (filePath: string | URL) => {
  if (filePath instanceof URL) return filePath;
  if (!filePath.startsWith('file:/')) filePath = `file://${resolve(filePath)}`;
  return new URL(filePath);
};
