import { resolve } from 'path';
import createAzureTelegramWebhook, {
  DevServer,
  startDevServer,
  Update,
} from '../src';
import { calculateNewOffset, loadWebhooks } from '../src/dev-server';
import { withNockback } from './helpers';

process.env.BOT_API_TOKEN ??= '1111:fake_token';

describe('dev server', () => {
  it('gets updates and sends responses (azure)', async () => {
    expect.assertions(1);
    await withNockback('devServer.json', async () => {
      const server = startDevServer(
        __dirname + '/__test-project-azure__/webhook1',
        'silent',
        1,
      )[0];
      server.stop();
      await new Promise((r) => setTimeout(r, 100));
      expect(server.offset).toBe(320849219);
    });
  });

  it('gets updates and sends responses (aws)', async () => {
    expect.assertions(1);
    await withNockback('devServer.json', async () => {
      const server = startDevServer(
        __dirname + '/__test-project-aws__/src/handlers/webhook.lambdaHandler',
        undefined,
        1,
      )[0];
      server.stop();
      await new Promise((r) => setTimeout(r, 100));
      expect(server.offset).toBe(320849219);
    });
  });

  it('loads all function scripts in an Azure project (if any)', () => {
    expect(loadWebhooks()).toEqual([]);
    const projRoot = __dirname + '/__test-project-azure__';
    expect(loadWebhooks(projRoot).map((w) => w.path)).toEqual([
      resolve(projRoot, 'webhook1'),
      resolve(projRoot, 'webhook2'),
    ]);
  });

  it('loads all lambda handlers in an AWS project (if any)', () => {
    expect(loadWebhooks()).toEqual([]);
    expect(loadWebhooks(__dirname)).toEqual([]);
    const projRoot = __dirname + '/__test-project-aws__';
    expect(loadWebhooks(projRoot).map((w) => w.path)).toEqual([
      resolve(projRoot, 'src/handlers/webhook.lambdaHandler'),
    ]);
  });

  it('throws an error if no webhooks are found', () => {
    expect(() => startDevServer()).toThrowError(
      'no function entry points found',
    );
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
    expect(
      new DevServer({
        type: 'azure',
        handler: createAzureTelegramWebhook(() => {}),
        path: 'fake path',
      }),
    ).toHaveProperty('timeout', 55);
  });
});
