const { createAwsTelegramWebhook } = require('../../../../src');
exports.lambdaHandler = createAwsTelegramWebhook(
  ({ text }) => `You said: ${text}`,
);
