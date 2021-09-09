import type { InlineQuery, Message } from '../../src';
import { Env, InlineEnv, MessageEnv, wrapTelegram } from '../../src';
import { azureCtx, withNockback } from '../helpers';
import {
  chat_id,
  inlineQuery,
  inlineUpdate,
  message,
  responseMethod,
  update,
} from './test-data';

describe('MessageEnv', () => {
  it('is passed to message handler with correct properties', async () => {
    expect.assertions(2);
    const handler = (msg: Message, env: MessageEnv) => {
      expect(msg).toEqual(message);
      expect(env).toEqual({
        context: azureCtx,
        debug: azureCtx.log.verbose,
        info: azureCtx.log.info,
        warn: azureCtx.log.warn,
        error: azureCtx.log.error,
        message,
      });
    };
    await wrapTelegram(handler)(update, azureCtx);
  });

  it('supports calling the telegram API', () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      expect(
        new MessageEnv(azureCtx, message).send({ action: 'upload_document' }),
      ).resolves.toBe(true),
    );
  });
});

describe('InlineEnv', () => {
  it('is passed to inline query handler with correct properties', async () => {
    expect.assertions(2);
    const handler = (iq: InlineQuery, env: InlineEnv) => {
      expect(iq).toEqual(inlineQuery);
      expect(env).toEqual({
        context: azureCtx,
        debug: azureCtx.log.verbose,
        info: azureCtx.log.info,
        warn: azureCtx.log.warn,
        error: azureCtx.log.error,
        inlineQuery,
      });
    };
    await wrapTelegram({ inline: handler })(inlineUpdate, azureCtx);
  });

  it('supports calling the telegram API', () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      expect(
        new InlineEnv(azureCtx, inlineQuery).send({
          method: 'sendChatAction',
          chat_id: chat_id,
          action: 'upload_document',
        }),
      ).resolves.toBe(true),
    );
  });
});

describe('Env', () => {
  it('ignores NoResponse', () => {
    expect.assertions(1);
    wrapTelegram(async (_msg, env) =>
      expect(env.send()).resolves.toBeUndefined(),
    )(update, azureCtx);
  });

  it('ensures toUpdateRes is implemented', () => {
    expect(() =>
      new Env(azureCtx).toUpdateRes(responseMethod),
    ).toThrowErrorMatchingInlineSnapshot(
      `"toUpdateRes must be implemented by subclass!"`,
    );
  });
});
