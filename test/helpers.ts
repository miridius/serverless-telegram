import * as nock from 'nock';
import type { AwsContext, AzureContext, AzureLogger } from '../src';

export const log: AzureLogger = Object.assign(
  (jest.fn() as unknown) as AzureLogger,
  {
    verbose: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
);

export const azureCtx = { log } as AzureContext;
export const awsCtx = (null as unknown) as AwsContext;

export const withNockback = async (fixture: string, testFn: () => any) => {
  const { nockDone, context } = await nock.back(fixture);
  const result = await testFn();
  nockDone();
  context.assertScopesFinished();
  return result;
};
