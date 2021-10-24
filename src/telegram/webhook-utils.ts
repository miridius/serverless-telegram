import { SetWebHookOptions } from '../types';
import { callTgApi } from './telegram-api';

const removeFalsyProps = <T extends object>(obj: T): Partial<T> =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v)) as Partial<T>;

export const defaultWebhookOpts: Partial<SetWebHookOptions> = {
  // Process as many updates in parallel as the TG api will allow
  max_connections: 100,
  // These are all the types of updates that wrap-telegram will process
  allowed_updates: [
    'message',
    'edited_message',
    'channel_post',
    'edited_channel_post',
    'inline_query',
    'callback_query',
  ],
};

export const setWebhook = async (opts: SetWebHookOptions) => {
  opts = {
    ...defaultWebhookOpts,
    ...removeFalsyProps(opts),
  } as SetWebHookOptions;
  if (!opts.url) throw new Error('You must provide a URL to set the webhook');

  console.debug('Setting webhook:', opts);
  await callTgApi({ method: 'setWebhook', ...opts });

  console.debug('Getting webhook info:');
  const res = await callTgApi({ method: 'getWebhookInfo' });
  console.debug(res);

  Object.entries(opts).forEach(([opt, expected]) => {
    const ok = Array.isArray(expected)
      ? expected.every((ex, i) => res[opt][i] === ex)
      : res[opt] === expected;
    if (!ok) {
      throw new Error(`Webhook update failed - ${opt}s don't match!`);
    }
  });

  console.info('Successfully updated webhook');
  return res;
};

export const deleteWebhook = async () => {
  console.debug('Deleting webhook:');
  const res = await callTgApi({ method: 'deleteWebhook' });
  console.debug(res);

  console.debug('Getting webhook info:');
  const webhookInfo = await callTgApi({ method: 'getWebhookInfo' });
  console.debug(webhookInfo);

  if (webhookInfo.url) {
    throw new Error(
      `Delete webhook failed - url is still set to ${webhookInfo.url}`,
    );
  }

  console.info('Successfully deleted webhook');
  return webhookInfo;
};
