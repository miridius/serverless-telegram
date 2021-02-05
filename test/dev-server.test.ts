import { withNockback } from './helpers';
import createAzureTelegramWebhook, {
  startDevServer,
  DevServer,
  Update,
} from '../src';
import { calculateNewOffset, findFunctionEntrypoints } from '../src/dev-server';
import { resolve } from 'path';

process.env.BOT_API_TOKEN ??= '1111:fake_token';

describe('dev server', () => {
  it('gets updates and sends responses', async () => {
    expect.assertions(1);
    await withNockback('devServer.json', async () => {
      Object.assign(console.log, { verbose: jest.fn(), info: jest.fn() });
      const server = startDevServer(__dirname + '/testProject/webhook1', 1)[0];
      server.stop();
      await new Promise((r) => setTimeout(r, 100));
      expect(server.offset).toBe(320849219);
    });
  });

  it('finds all function scripts in a project (if any)', () => {
    expect(findFunctionEntrypoints()).toEqual([]);
    const projRoot = __dirname + '/testProject';
    expect(findFunctionEntrypoints(projRoot)).toEqual([
      resolve(projRoot, 'webhook1-script.js'),
      resolve(projRoot, 'webhook2'),
    ]);
  });

  it('calculates offset', () => {
    expect.assertions(8);
    expect(calculateNewOffset()).toBeUndefined();
    expect(calculateNewOffset(0)).toBe(0);
    for (const [offset, update_id, newOffset] of [
      [undefined, undefined, undefined],
      [undefined, -1, 0],
      [0, 0, 1],
      [50, 100, 101],
      [100, undefined, 100],
      [100, 50, 100],
    ]) {
      expect(calculateNewOffset(offset, { update_id } as Update)).toBe(
        newOffset,
      );
    }
  });

  it('defaults timeout to 55sec', () => {
    expect(new DevServer(createAzureTelegramWebhook(() => {}))).toHaveProperty(
      'timeout',
      55,
    );
  });
});
