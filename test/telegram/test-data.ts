import { resolve } from 'path';
import { Chat, InlineQuery, Message, ResponseMethod, Update } from '../../src';
import { toFileUrl } from '../../src/utils';

process.env.BOT_API_TOKEN ??= '1111:fake_token';
export const chat_id = parseInt(process.env.TEST_CHAT_ID || '') || 2222;

export const chat: Chat = {
  id: chat_id,
  type: 'private',
};

export const text = 'Hello World!';

export const message: Message = {
  message_id: 2,
  chat,
  text,
  date: 123,
};

export const update: Update = {
  update_id: 1,
  message,
};

export const responseMethod: ResponseMethod = {
  method: 'sendMessage',
  chat_id,
  text,
};

export const sticker = 'sticker URL';
export const stickerResponse: ResponseMethod = {
  method: 'sendSticker',
  chat_id,
  sticker,
};

export const video = 'http://example.com';
export const videoResponse: ResponseMethod = {
  method: 'sendVideo',
  chat_id,
  video,
};

export const docPath = resolve(__dirname, '../__fixtures__/test-file.txt');
export const sendDocument = {
  document: toFileUrl(docPath),
  reply_to_message_id: 23,
  reply_markup: {
    inline_keyboard: [[{ text: 'Click me', url: 'https://example.com' }]],
  },
};
export const docResponse: ResponseMethod = {
  ...sendDocument,
  method: 'sendDocument',
  chat_id,
};

export const queryId = 'q';
export const inlineQuery: InlineQuery = {
  id: queryId,
  query: 'foo',
} as InlineQuery;
export const inlineUpdate: Update = { update_id: 1, inline_query: inlineQuery };
