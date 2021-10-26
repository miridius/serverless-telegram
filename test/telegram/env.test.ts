import type { CallbackQuery, InlineQuery, Message } from '../../src';
import {
  CallbackEnv,
  Env,
  InlineEnv,
  MessageEnv,
  wrapTelegram,
} from '../../src';
import { azureCtx, withNockback } from '../helpers';
import {
  callbackQuery,
  callbackUpdate,
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
        chatId: chat_id,
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

describe('CallbackEnv', () => {
  it('is passed to callback query handler with correct properties', async () => {
    expect.assertions(2);
    const handler = (cq: CallbackQuery, env: CallbackEnv) => {
      expect(cq).toEqual(callbackQuery);
      expect(env).toEqual({
        context: azureCtx,
        debug: azureCtx.log.verbose,
        info: azureCtx.log.info,
        warn: azureCtx.log.warn,
        error: azureCtx.log.error,
        callbackQuery,
        chatId: chat_id,
      });
    };
    await wrapTelegram({ callback: handler })(callbackUpdate, azureCtx);
  });

  it('supports calling the telegram API', () => {
    expect.assertions(1);
    return withNockback('sendChatAction.json', () =>
      expect(
        new CallbackEnv(azureCtx, callbackQuery).send({
          action: 'upload_document',
        }),
      ).resolves.toBe(true),
    );
  });

  it('env.send needs a chat_id', () => {
    expect(() =>
      new CallbackEnv(azureCtx, { id: 'foo' } as CallbackQuery).send({
        action: 'upload_document',
      }),
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      `"Env.send cannot be used because there is no chat id in the callback query"`,
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
