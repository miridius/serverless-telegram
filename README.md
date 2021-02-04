# serverless-telegram

[![npm version](https://badge.fury.io/js/serverless-telegram.svg)](https://badge.fury.io/js/serverless-telegram)
[![Known Vulnerabilities](https://snyk.io/test/github/miridius/serverless-telegram/badge.svg)](https://snyk.io/test/github/miridius/serverless-telegram)
[![GitHub license](https://img.shields.io/github/license/miridius/serverless-telegram)](https://github.com/miridius/serverless-telegram/blob/master/LICENSE)
[![GitHub CI](https://github.com/miridius/serverless-telegram/workflows/CI/badge.svg)](https://github.com/miridius/serverless-telegram/actions?query=workflow%3ACI)
[![Coverage](https://api.codeclimate.com/v1/badges/8a8ce85bd1e8605d3732/test_coverage)](https://codeclimate.com/github/miridius/serverless-telegram/test_coverage)

A simple library to remove some of the repetitive work in creating servlerless telegram bots.

The most support is provided for Azure Function Apps but other platforms can also be used with a little extra work.

Your job is to write a handler function that takes a Message and optionally returns a response. The rest will be taken care of.

## Breaking Changes v0.3 -> v0.4

1. Message handlers and inline handlers are now passed an `env` object, instead of a logger;
   the logger is now at `env.log`. However, you can use `env.debug`, `env.info`, `env.warn`, and `env.error` to log at a specific level.
2. Raw HTTP Responses can no longer be returned - this was a workaround to support file uploads but is no longer needed since file upload support has been added to the normal responses.

## Getting Started

1. Use the [official quickstart](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-node) to create a new Azure function using JavaScript or TypeScript. I recommend calling the function something like "telegram-webhook" or just "webhook" but it really doesn't matter.
1. Install `serverless-telegram` as a dependency:

   ```bash
   npm install serverless-telegram
   ```

1. Replace the function's `index.js` or `index.ts` with the following:

   - JavaScript:

     ```js
     const { createAzureTelegramWebhook } = require('serverless-telegram');

     module.exports = createAzureTelegramWebhook(
       ({ text }) => text && `You said: ${text}`,
     );
     ```

   - TypeScript:

     ```ts
     import { createAzureTelegramWebhook } from 'serverless-telegram';

     export default createAzureTelegramWebhook(
       ({ text }) => text && `You said: ${text}`,
     );
     ```

1. Edit the function's `function.json` and set `authLevel` to `function` and `methods` to `["post"]`, for example:

   ```json
   {
     "bindings": [
       {
         "authLevel": "function",
         "type": "httpTrigger",
         "direction": "in",
         "name": "req",
         "methods": ["post"]
       },
       {
         "type": "http",
         "direction": "out",
         "name": "res"
       }
     ]
   }
   ```

1. Use the VSCode Azure extension to add a new Application Setting to your app: `NODE_ENV`=`production`
1. Re-deploy the app (replace existing deployment)
1. Copy the URL of your deployed function
1. Create a new telegram bot and set its webhook to point to this URL
1. Start a private chat with the bot and say "/start". It should reply with "You said: /start"

## Advanced Usage

`createAzureTelegramWebhook` is passed a `MessageHandler`, which is a (usually async) function that takes 2 arguments, a [Message](https://core.telegram.org/bots/api#message) and an execution environment (`Env`). The most used property is `env.log` which is a logger (the Azure [context.log object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#write-trace-output-to-logs)) that must be used for logging instead of console.log. The env object is passed to each call since each function execution has its own individual logging output.

The message handler can return any of the following data types:

- `string` - will send a text reply back to the same chat the message came from
- `ResponseObject` - an object representing a richer response type. Any of the telegram bot API `send*` [methods](https://core.telegram.org/bots/api#available-methods) are supported (for example `sendPhoto`, `sendMessage`, etc.), but you don't need to specify the chat_id or the method name. Some examples:

  - `{ photo: 'https://example.com/image.png' }` - send a photo from a URL
  - `{ text: 'hello there' }` - send a message (equivalent to returning 'hello there')
  - `{ video: '<video file ID>' }` - resend a video for which you know the file ID

- `ResponseMethod` - Any of the telegram bot API [methods](https://core.telegram.org/bots/api#available-methods). This must be an object with the `method` key set to the method name (e.g. 'sendMessage'), along with any other desired parameters. If `chat_id` is not specified, it will automatically be set to be the same as that of the incoming message
- `NoResponse` - any falsy value (or void) will signify that no reply should be sent.

`createAzureTelegramWebhook` can optionally be passed a second argument which is a telegram chat ID to send error reports to.

Here is a slightly more advanced example that greets users on any text message, echos sticker messages, and ignores all other messages:

```js
const { createAzureTelegramWebhook } = require('serverless-telegram');

const MY_CHAT_ID = 0; // TODO: Set your chat ID

module.exports = createAzureTelegramWebhook(async (msg, log) => {
  log.info('Got message:', msg);
  const {
    text,
    sticker,
    from: { first_name },
    chat: { id },
  } = msg;
  if (text) return `Hello ${first_name}! Our chat ID is: ${id}`;
  if (sticker) return { sticker: sticker.file_id };
}, MY_CHAT_ID);
```

`createAzureTelegramWebhook` is internally made of two parts: `wrapTelegram` and `wrapAzure`. To use this library for other platforms besides Azure, you can use `wrapTelegram` directly and write your own http wrapper. `wrapTelegram` takes the same arguments as `createAzureTelegramWebhook`, and will return a function that takes the JSON-parsed webhook body (i.e. a telegram update object) and returns the desired response body as a JS object (not stringified)

## Sending Local Files

To upload a local file (e.g. a photo or video), return or send a `ResponseObject` or `ResponseMethod` as normal (see above), but wrap the file path in call to `fs.createReadStream`. For example:

```js
return { photo: fs.createReadStream('birds.png') };
```

If you want to save the file ID, see the section "Using the Telegram API mid-execution"

## Handling Inline Queries

Instead of passing `createAzureTelegramWebhook` a `MessageHandler` directly, you can pass it a `HandlerMap` object containing one or both of the keys `message` and `inline`. When updates arrive, they will be routed to the appropriate handler (or ignored if no handler of that type is defined):

```ts
interface HandlerMap {
  message?: MessageHandler;
  inline?: InlineHandler;
}
```

An `InlineHandler` is a (usually async) function that takes 2 arguments, a [InlineQuery](https://core.telegram.org/bots/api#inlinequery) and the Env object (containing the [context.log object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#write-trace-output-to-logs) among other things). The inline handler can return any of the following data types:

- Array of `InlineResult` objects, which are just like [InlineQueryResult](https://core.telegram.org/bots/api#inlinequeryresult)s but for convenience the `id` and `type` fields are optional - when not specified the ID will the array index and the type will be inferred automatically from the other parameters.
- [AnswerInlineQuery](https://core.telegram.org/bots/api#answerinlinequery) object, in case you want to specify additional options for example `cache_time`. For convenience the inline_query_id can be left out and will be copied from the incoming query. The results array can contain `InlineResult` objects (i.e. the `id` and `type` fields are optional).
- `ResponseMethod` - Instead of answering the inline query, you can send any of the telegram bot API [methods](https://core.telegram.org/bots/api#available-methods). This must be an object with the `method` key set to the method name (e.g. 'sendMessage'), along with any other desired parameters. Note that since inline queries do not come from a chat, `chat_id` cannot be automatically set and must be provided by you if required
- `NoResponse` - any falsy value (or void) will signify that no reply should be sent.

## Using the Telegram API mid-execution

For most use cases it is enough to simply return the bot's desired response, however sometimes you might want to manually call the telegram API, for example:

- Sending a [chat action](https://core.telegram.org/bots/api#sendchataction) before you start processing
- Sending more than one response
- Using the Telegram API return value

To do so, first set the environment variable `BOT_API_TOKEN` to your bot's API token (obtainable from the BotFather). You can do this by adding it as an Application Setting to your Azure function app.

Then, use the `send` method on the `env` object passed to your handler. It takes a single argument which can be any of the same times that a MessageHandler can return, i.e. a ResponseObject or a ResponseMethod. (You can also pass it a NoResponse but it will do nothing)

1. The method name (e.g. `'sendMessage'`)
1. (Optional) object mapping parameters to their values (e.g. `{ text: 'hello' }`)
1. (Optional) object mapping parameters to file paths, for uploading files from disk (e.g. `{ video: '/path/to/video.mp4' }`).

It returns a promise which resolves to the response data (if any).

Example usage:

```js
// let the user know that something is happening since it might take a while
env.send({ action: 'upload_video' });
// Note: intentially *not* await-ing in this case so that work continues in parallel

// send the video
const result = await env.send({
  video: fs.createReadStream(localFilePath),
  width: 640,
  height: 480,
  caption: 'Cute cat video',
});

// save the file ID
const fileId = result?.video?.file_id;
env.debug('fileId:', fileId);

// the file ID can be used to send the same video again without re-uploading:
if (fileId) return { video: fileId };
```

## Development (via [TSDX](https://github.com/formium/tsdx))

### Initial Setup

Prerequisites:

- NodeJS v14 (to support Azure functions)
- Yarn (to support package resolutions overrides)

Clone the repo and then run `yarn install`

### Commands

TSDX scaffolds the library inside `/src`.

To run TSDX, use:

```bash
yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

To do a one-off build, use `yarn build`.

To run tests, use `yarn test`.

To run tests in watch mode, use `yarn dev`.

### Configuration

Code quality is set up for you with `prettier`, `husky` (v3, since v4 does not support VS Code), and `lint-staged`. Adjust the respective fields in `package.json` accordingly.

#### Jest

Jest tests are set up to run with `yarn test`.

#### Bundle Analysis

[`size-limit`](https://github.com/ai/size-limit) is set up to calculate the real cost of your library with `npm run size` and visualize the bundle with `npm run analyze`.

#### Rollup

TSDX uses [Rollup](https://rollupjs.org) as a bundler and generates multiple rollup configs for various module formats and build settings. See [Optimizations](#optimizations) for details.

#### TypeScript

`tsconfig.json` is set up to interpret `dom` and `esnext` types, as well as `react` for `jsx`. Adjust according to your needs.

#### Continuous Integration

#### GitHub Actions

Two actions are added by default:

- `main` which installs deps w/ cache, lints, tests, and builds on all pushes against a Node and OS matrix
- `size` which comments cost comparison of your library on every pull request using [`size-limit`](https://github.com/ai/size-limit)

### Optimizations

Please see the main `tsdx` [optimizations docs](https://github.com/palmerhq/tsdx#optimizations). In particular, know that you can take advantage of development-only optimizations:

```js
// ./types/index.d.ts
declare var __DEV__: boolean;

// inside your code...
if (__DEV__) {
  console.log('foo');
}
```

You can also choose to install and use [invariant](https://github.com/palmerhq/tsdx#invariant) and [warning](https://github.com/palmerhq/tsdx#warning) functions.

### Module Formats

CJS, ESModules, and UMD module formats are supported.

The appropriate paths are configured in `package.json` and `dist/index.js` accordingly. Please report if any issues are found.

### Named Exports

Per Palmer Group guidelines, [always use named exports.](https://github.com/palmerhq/typescript#exports) Code split inside your React app instead of your React library.

### Including Styles

There are many ways to ship styles, including with CSS-in-JS. TSDX has no opinion on this, configure how you like.

For vanilla CSS, you can include it at the root directory and add it to the `files` section in your `package.json`, so that it can be imported separately by your users and run through their bundler's loader.

### Publishing to NPM

We recommend using [np](https://github.com/sindresorhus/np).
