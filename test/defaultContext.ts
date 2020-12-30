import { Context } from '@azure/functions';

export default ({ log: jest.fn() } as unknown) as Context;
