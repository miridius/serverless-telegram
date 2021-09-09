#! /usr/bin/env node
const [, , url, maxConnections, ...allowedUpdates] = process.argv;
require('../dist').setWebhook({
  url,
  max_connections: parseInt(maxConnections),
  allowed_updates: allowedUpdates.length && allowedUpdates,
});
