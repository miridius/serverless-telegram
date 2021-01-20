# serverless-telegram

[![npm version](https://badge.fury.io/js/serverless-telegram.svg)](https://badge.fury.io/js/serverless-telegram)
[![Known Vulnerabilities](https://snyk.io/test/github/miridius/serverless-telegram/badge.svg)](https://snyk.io/test/github/miridius/serverless-telegram)
[![GitHub CI](https://github.com/miridius/serverless-telegram/workflows/CI/badge.svg)](https://github.com/miridius/serverless-telegram/actions?query=workflow%3ACI)
[![Coverage](https://api.codeclimate.com/v1/badges/8a8ce85bd1e8605d3732/test_coverage)](https://codeclimate.com/github/miridius/serverless-telegram/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/8a8ce85bd1e8605d3732/maintainability)](https://codeclimate.com/github/miridius/serverless-telegram/maintainability)

A simple library to remove some of the repetitive work in creating servlerless telegram bots.

The most support is provided for Azure Function Apps but other platforms can also be used with a little extra work.

Your job is to write a handler function that takes a Message and optionally returns a response. The rest will be taken care of.

## Getting Started

1. Use the [official quickstart](https://docs.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-node) to create a new Azure function using JavaScript or TypeScript. I recommend calling the function something like "telegram-webhook" or just "webhook" but it really doesn't matter.
2. Install `serverless-telegram` as a dependency:

   ```bash
   npm install serverless-telegram
   ```

3. Replace the function's `index.js` or `index.ts` with the following:

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

4. Edit the function's `function.json` and set `authLevel` to `function` and `methods` to `["post"]`, for example:

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

5. Use the VSCode Azure extension to add a new Application Setting to your app: `NODE_ENV`=`production`
6. Re-deploy the app (replace existing deployment)
7. Copy the URL of your deployed function
8. Create a new telegram bot and set its webhook to point to this URL
9. Start a private chat with the bot and say "/start". It should reply with "You said: /start"

## Advanced Usage

`createAzureTelegramWebhook` is passed a `MessageHandler`, which is a (usually async) function that takes 2 arguments, a [Message](https://core.telegram.org/bots/api#message) and a logger (the Azure [context.log object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#write-trace-output-to-logs)).

The message handler can return any of the following data types:

- `string` - will send a text reply back to the same chat the message came from
- `ResponseObject` - an object representing a richer response type:

  ```ts
  interface ResponseObject {
    // *exactly one* of the following 4 keys should be included
    text?: string;
    sticker?: string; // URL or file ID
    video?: string; // URL or file ID
    media?: string[]; // Array of URLs or file IDs
    // OPTIONAL: redirect response to a different chat than the message came from
    chat_id?: number;
  }
  ```

- `ResponseMethod` - Any of the telegram bot API [methods](https://core.telegram.org/bots/api#available-methods). This must be an object with the `method` key set to the method name (e.g. 'sendMessage'), along with any other desired parameters. If `chat_id` is not specified, it will automatically be set to be the same as that of the incoming message
- `HttpResponse` - in case greater control is needed you can send an [Azure http response object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=javascript#example) and it will be passed through as is. It must contain at least one of the following keys: `status`, `body`, or `headers`.
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

## Handling Inline Queries

Instead of passing `createAzureTelegramWebhook` a `MessageHandler` directly, you can pass it a `HandlerMap` object containing one or both of the keys `message` and `inline`. When updates arrive, they will be routed to the appropriate handler (or ignored if no handler of that type is defined):

```ts
interface HandlerMap {
  message?: MessageHandler;
  inline?: InlineHandler;
}
```

An `InlineHandler` is a (usually async) function that takes 2 arguments, a [InlineQuery](https://core.telegram.org/bots/api#inlinequery) and a logger (the Azure [context.log object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#write-trace-output-to-logs)). The inline handler can return any of the following data types:

- Array of [InlineQueryResult](https://core.telegram.org/bots/api#inlinequeryresult) objects and/or `InlineResult` objects, which are the same as `InlineQueryResult` but without the `id` and `type` fields - the ID will the array index and the type will be inferred from the content **(so far only photos and videos are implemented)**
- [AnswerInlineQuery](https://core.telegram.org/bots/api#answerinlinequery) object, in case you want to specify additional options for example `cache_time`. For convenience the inline_query_id can be left out and will be copied from the incoming query. The results array can contain both `InlineQueryResult` and `InlineResult` objects.
- `HttpResponse` - in case greater control is needed you can send an [Azure http response object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger?tabs=javascript#example) and it will be passed through as is. It must contain at least one of the following keys: `status`, `body`, or `headers`.
- `NoResponse` - any falsy value (or void) will signify that no reply should be sent.

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
