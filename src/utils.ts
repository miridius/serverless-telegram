export const isObject = (x: unknown): x is Exclude<object, null> =>
  typeof x === 'object' && x !== null;
