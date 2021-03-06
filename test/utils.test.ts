import { withNockback } from './helpers';
import { setWebhook } from '../src/utils';

process.env.BOT_API_TOKEN ??= '1111:fake_token';

describe('setWebhook', () => {
  it('works', () => {
    return withNockback('setWebhook.json', () => {
      return expect(
        setWebhook({
          url: 'https://example.com',
          max_connections: 100,
          allowed_updates: ['message', 'edited_message'],
        }),
      ).resolves.toMatchInlineSnapshot(`
                Object {
                  "allowed_updates": Array [
                    "message",
                    "edited_message",
                  ],
                  "has_custom_certificate": false,
                  "ip_address": "1.2.3.4",
                  "max_connections": 100,
                  "pending_update_count": 0,
                  "url": "https://example.com",
                }
              `);
    });
  });

  it('throws an error if the webhook was not updated successfully', () => {
    return withNockback('setWebhook2.json', () => {
      return expect(() =>
        setWebhook({
          url: 'https://some-other-url.com',
          max_connections: 100,
          allowed_updates: ['message', 'edited_message'],
        }),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Webhook update failed - urls don't match!"`,
      );
    });
  });
});
