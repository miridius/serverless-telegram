import wrapTelegram, { MessageHandler } from './wrap-telegram';
import wrapAzure from './wrap-azure';

export const createAzureTelegramWebhook = (handler: MessageHandler) =>
  wrapAzure(wrapTelegram(handler));
