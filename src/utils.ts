import { resolve } from 'path';
import { URL } from 'url';
import type { FileBuffer } from './types';

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

export const mapIfArray = <T, R>(xOrXs: T | T[], fn: (x: T) => R): R | R[] =>
  Array.isArray(xOrXs) ? xOrXs.map(fn) : fn(xOrXs);
