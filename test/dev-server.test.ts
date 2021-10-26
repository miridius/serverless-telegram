import { resolve } from 'path';
import createAzureTelegramWebhook, {
  AzureLogger,
  DevServer,
  startDevServer,
  Update,
} from '../src';
import { loadWebhooks } from '../src/dev-server';
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

  it('ignores empty responses', async () => {
    const srv = new DevServer({
      type: 'azure',
      handler: () => undefined,
      path: '',
    });
    (srv as any).handleUpdate();
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
    expect.assertions(7);
    const srv = new DevServer({} as any);
    (srv as any).updateOffset();
    expect(srv.offset).toBeUndefined();
    for (const [offset, update_id, newOffset] of [
      [undefined, undefined, undefined],
      [undefined, -1, 0],
      [0, 0, 1],
      [50, 100, 101],
      [100, undefined, 100],
      [100, 50, 100],
    ]) {
      srv.offset = offset;
      (srv as any).updateOffset({ update_id } as Update);
      expect(srv.offset).toEqual(newOffset);
    }
  });

  it('defaults timeout to 55sec', () => {
    expect(
      new DevServer({
        type: 'azure',
        handler: createAzureTelegramWebhook(() => undefined),
        path: 'fake path',
      }),
    ).toHaveProperty('timeout', 55);
  });

  it('catches and logs errors', async () => {
    const error = jest.fn();
    const srv = new DevServer(
      {
        type: 'azure',
        handler: () => {
          throw new Error('foo');
        },
        path: '',
      },
      { error } as unknown as AzureLogger,
    );
    await (srv as any).handleUpdate();
    expect(error).toHaveBeenCalledWith(new Error('foo'));
  });
});
