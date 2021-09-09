const { createAzureTelegramWebhook } = require('../../src');
module.exports = createAzureTelegramWebhook(({ text }) => `You said: ${text}`);
