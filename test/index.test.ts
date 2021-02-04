import { ctx } from './helpers';
import type { Message, MessageHandler, MessageResponse } from '../src';
import { createAzureTelegramWebhook } from '../src';

const textMsgUpdate = {
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

const handler: MessageHandler = ({ text }: Message): MessageResponse => text;

describe('createAzureTelegramWebhook', () => {
  it('handles telegram webhook updates and responses via http', () => {
    const webhook = createAzureTelegramWebhook(handler);
    return expect(webhook(ctx, textMsgUpdate)).resolves.toEqual(textResponse);
  });
});
