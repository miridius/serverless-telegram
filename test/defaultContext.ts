import { Context, Logger } from '@azure/functions';

const log = (jest.fn() as unknown) as Logger;
log.verbose = jest.fn();
log.info = jest.fn();
log.warn = jest.fn();
log.error = jest.fn();

export default { log } as Context;
