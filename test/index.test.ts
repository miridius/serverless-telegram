import ctx from './defaultContext';
import type { Message, MessageHandler, Response } from '../src';
import { createAzureTelegramWebhook } from '../src';

const textMessageUpdate = {
  body: {
    update_id: 1,
    message: { text: 'more good things please', chat: { id: 1 } },
  },
};

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

const handler: MessageHandler = async ({ text }: Message): Promise<Response> =>
  text;

// note: we use async/await because Jest's .resolves does not fail the tests.
describe('createAzureTelegramWebhook', () => {
  it('handles telegram webhook updates and responses via http', async () => {
    const webhook = createAzureTelegramWebhook(handler);
    expect(await webhook(ctx, textMessageUpdate)).toEqual(textResponse);
  });
});
