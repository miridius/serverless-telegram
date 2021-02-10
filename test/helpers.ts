import { Context, Logger } from '@azure/functions';
import * as nock from 'nock';

Object.assign(console, { debug: jest.fn(), info: jest.fn() });
export const log: Logger = Object.assign((jest.fn() as unknown) as Logger, {
  verbose: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});
export const ctx: Context = { log } as Context;

nock.back.fixtures = __dirname + '/__fixtures__/';
nock.back.setMode(process.env.CI ? 'lockdown' : 'record');

afterAll(nock.restore);

export const withNockback = async (fixture: string, testFn: () => any) => {
  const { nockDone, context } = await nock.back(fixture);
  const result = await testFn();
  nockDone();
  context.assertScopesFinished();
  return result;
};
