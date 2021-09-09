import {
  AwsHttpRequest,
  AzureHttpRequest,
  createAwsTelegramWebhook,
  createAzureTelegramWebhook,
  Message,
  MessageHandler,
  MessageResponse,
} from '../src';
import { awsCtx, azureCtx } from './helpers';

const azureRequest = {
  body: {
    update_id: 1,
    message: { text: 'more good things please', chat: { id: 1 } },
  },
} as AzureHttpRequest;

const awsRequest = {
  body: JSON.stringify(azureRequest.body),
} as AwsHttpRequest;

const azureResponse = {
  body: {
    chat_id: 1,
    method: 'sendMessage',
    text: 'more good things please',
  },
  headers: {
    'Content-Type': 'application/json',
  },
};

const awsResponse = azureResponse.body;

const handler: MessageHandler = ({ text }: Message): MessageResponse => text;

describe('createAzureTelegramWebhook', () => {
  it('handles telegram webhook updates and responses via http', () => {
    const webhook = createAzureTelegramWebhook(handler);
    return expect(webhook(azureCtx, azureRequest)).resolves.toEqual(
      azureResponse,
    );
  });
});

describe('createAwsTelegramWebhook', () => {
  it('handles telegram webhook updates and responses via http', () => {
    const webhook = createAwsTelegramWebhook(handler);
    return expect(webhook(awsRequest, awsCtx)).resolves.toEqual(awsResponse);
  });
});
