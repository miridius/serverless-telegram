#! /usr/bin/env node
import { setWebhook } from '../dist';

const [, , url, maxConnections, ...allowedUpdates] = process.argv;

setWebhook({
  url,
  max_connections: parseInt(maxConnections),
  allowed_updates: allowedUpdates.length && allowedUpdates,
});
