import { deleteWebhook, setWebhook } from '../../src';
import { withNockback } from '../helpers';

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
                {
                  "allowed_updates": [
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

  it('throws an error if no URL is passed', () => {
    return expect(() =>
      setWebhook({ url: '' }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"You must provide a URL to set the webhook"`,
    );
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

describe('deleteWebhook', () => {
  it('works', () => {
    return withNockback('deleteWebhook.json', () => {
      return expect(deleteWebhook()).resolves.toMatchInlineSnapshot(`
                {
                  "allowed_updates": [
                    "message",
                    "edited_message",
                  ],
                  "has_custom_certificate": false,
                  "pending_update_count": 0,
                  "url": "",
                }
              `);
    });
  });

  it('throws an error if the webhook was not deleted', () => {
    return withNockback('deleteWebhook2.json', () => {
      return expect(() =>
        deleteWebhook(),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Delete webhook failed - url is still set to https://example.com"`,
      );
    });
  });
});
