import { HttpRequest } from '@azure/functions';
import ctx from './defaultContext';
import { createAzureTelegramWebhook } from '../src';

const textMessageUpdate = {
  body: { message: { text: 'more good things please', chat: { id: 1 } } },
} as HttpRequest;

const textResponse = {
  body: {
    chat_id: 1,
    method: 'sendMessage',
    text: 'more good things please',
  },
  headers: {
    'Content-Type': 'application/json',
  },
};

describe('createAzureTelegramWebhook', () => {
  const webhook = createAzureTelegramWebhook(async ({ text }) => text);

  // note: we use async/await because Jest's .resolves does not fail the tests.
  it('handles telegram webhook updates and responses', async () => {
    expect(await webhook(ctx, textMessageUpdate)).toEqual(textResponse);
  });
});
