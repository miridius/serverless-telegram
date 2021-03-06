# serverless-telegram

[![npm version](https://badge.fury.io/js/serverless-telegram.svg)](https://www.npmjs.com/package/serverless-telegram)
[![Known Vulnerabilities](https://snyk.io/test/github/miridius/serverless-telegram/badge.svg)](https://snyk.io/test/github/miridius/serverless-telegram)
[![GitHub license](https://img.shields.io/github/license/miridius/serverless-telegram)](https://github.com/miridius/serverless-telegram/blob/master/LICENSE)
[![GitHub CI](https://github.com/miridius/serverless-telegram/workflows/CI/badge.svg)](https://github.com/miridius/serverless-telegram/actions?query=workflow%3ACI)
[![Coverage](https://api.codeclimate.com/v1/badges/8a8ce85bd1e8605d3732/test_coverage)](https://codeclimate.com/github/miridius/serverless-telegram/test_coverage)

A library to remove some of the repetitive work in creating servlerless telegram bots.

The most support is provided for Azure Function Apps but other platforms can also be used with a little extra work.

Your job is to write handler functions that receive a message (or inline query) and optionally return a response. The rest will be taken care of.

# Table of Contents

- [serverless-telegram](#serverless-telegram)
- [Table of Contents](#table-of-contents)
- [Getting Started](#getting-started)
  - [Next steps](#next-steps)
- [Documentation](#documentation)
  - [Creating a webhook](#creating-a-webhook)
    - [Example Setup](#example-setup)
  - [Types](#types)
    - [HandlerMap](#handlermap)
    - [MessageHandler](#messagehandler)
    - [InlineHandler](#inlinehandler)
    - [MessageEnv and InlineEnv](#messageenv-and-inlineenv)
    - [MessageResponse](#messageresponse)
    - [InlineResponse](#inlineresponse)
  - [Uploading Files](#uploading-files)
  - [Using the Telegram API mid-execution](#using-the-telegram-api-mid-execution)
  - [Logging](#logging)
  - [Receiving error reports](#receiving-error-reports)
  - [Running a local bot server during development](#running-a-local-bot-server-during-development)
    - [TL;DR](#tldr)
    - [Long version](#long-version)
  - [Using with other cloud providers (AWS, GCP, etc)](#using-with-other-cloud-providers-aws-gcp-etc)
- [Developing serverless-telegram (via <a href="https://github.com/formium/tsdx">TSDX</a>)](#developing-serverless-telegram-via-tsdx)
  - [Initial Setup](#initial-setup)
  - [Commands](#commands)
  - [Configuration](#configuration)
    - [Jest](#jest)
    - [Bundle Analysis](#bundle-analysis)
    - [Rollup](#rollup)
    - [TypeScript](#typescript)
    - [Continuous Integration](#continuous-integration)
    - [GitHub Actions](#github-actions)
  - [Optimizations](#optimizations)
  - [Module Formats](#module-formats)
  - [Publishing to NPM](#publishing-to-npm)

# Getting Started

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
1. Copy the URL of your deployed function using the VS code extension
1. Create a new telegram bot and set its webhook to point to this URL. A CLI tool is provided for convenience:
   ```sh
   BOT_API_TOKEN=<your-bot-token> npx set-webhook <your-function-url>
   ```
1. Start a private chat with the bot and say "/start". It should reply with "You said: /start"

## Next steps

Here is a slightly more complex example demonstrating some of the concepts that are documented later in this readme. This bot greets users on any text message, echos sticker messages, and ignores all other messages. It also has logging and error reporting enabled.

```js
const { createAzureTelegramWebhook } = require('serverless-telegram');

const MY_CHAT_ID = 0; // TODO: Set your chat ID for error reports

module.exports = createAzureTelegramWebhook(async (msg, env) => {
  env.info('Got message:', msg);
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

# Documentation

## Creating a webhook

This library has a functional-style API in order to facilitate easier testing. You can write your message and/or inline query handlers as pure functions and then pass them to `createAzureTelegramWebhook`, which will turn it/them into an azure http function ready for deployment to your function app.

`createAzureTelegramWebhook` takes 2 arguments:

- `handler` - either a [HandlerMap](#HandlerMap) or just a [MessageHandler](#MessageHandler)
- `errorChatId` _(optional)_ - see [Receiving error reports](#receiving-error-reports)

The return value should then be exported by your function's main script.

Once deployed to your Azure app, you'll need to get the function's URL (you can do this via the VS code extension) and set it as your bot's webhook. To do the latter step, a CLI tool is provided for convenience:

```sh
BOT_API_TOKEN=<your-bot-token> npx set-webhook <your-function-url>
```

### Example Setup

```js
// handler.js
exports.message = ({ text }, env) => text && `You said: ${text}`;
exports.inline = ({ query }, env) =>
  query && [{ photo_url: `https://i.imgur.com/${query}.jpeg` }];
```

```js
// index.js
const { createAzureTelegramWebhook } = require('serverless-telegram');
const handler = require('./handler');
const errorChatId = parseInt(process.env.BOT_ERROR_CHAT_ID);

module.exports = createAzureTelegramWebhook(handler, errorChatId);
```

## Types

### `HandlerMap`

A simple object allowing an inline handler and/or message handler to be specified.

If no inline handler is needed, you can also just pass the message handler directly to `createAzureTelegramWebhook`

<pre>
interface HandlerMap {
  message?: <a href="#messagehandler">MessageHandler</a>;
  inline?: <a href="#inlinehandler">InlineHandler</a>;
}
</pre>

### `MessageHandler`

<pre>
type MessageHandler = (
  message: <a href="https://core.telegram.org/bots/api#message">Message</a>,
  env: <a href="#messageenv-and-inlineenv">MessageEnv</a>,
) => <a href="#messageresponse">MessageResponse</a> | Promise<<a href="#messageresponse">MessageResponse</a>>;
</pre>

### `InlineHandler`

<pre>
type InlineHandler = (
  inlineQuery: <a href="https://core.telegram.org/bots/api#inlinequery">InlineQuery</a>,
  env: <a href="#messageenv-and-inlineenv">InlineEnv</a>,
) => <a href="#inlineresponse">InlineResponse</a> | Promise<<a href="#inlineresponse">InlineResponse</a>>;
</pre>

### `MessageEnv` and `InlineEnv`

The second argument passed to message and inline handlers is a `MessageEnv` or `InlineEnv` respectively. This is an object with the following properties:

- `context`: the Azure [context object](https://docs.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=v2#context-object)
- `message` (only on `MessageEnv`): the incoming `Message`
- `inlineQuery` (only on `InlineEnv`): the incoming `InlineQuery`
- `debug(...data)`: function which logs to the debug log level (pointer to the _incorrectly named_ `context.log.verbose` )
- `info(...data)`: function to logs at info level (`-> context.log.info`)
- `warn(...data)`: function to logs at warn level (`-> context.log.warn`)
- `error(...data)`: function to logs at error level (`-> context.log.error`)
- `async send(res)`: Call the Telegram Bot API asynchronously _during_ handler execution, see [Using the Telegram API mid-execution](#using-the-telegram-api-mid-execution)

### `MessageResponse`

A message handler can return any of the following data types:

- `string` - will send a text reply back to the same chat the message came from
- `ResponseObject` - an object representing a richer response type. Any of the telegram bot API `send*` [methods](https://core.telegram.org/bots/api#available-methods) are supported (`sendPhoto`, `sendMessage`, etc.), but for convenience the `chat_id` and `method` can be omitted and will be filled in automatically. Some examples:

  - `{ photo: 'https://example.com/image.png' }` - send a photo from a URL
  - `{ text: 'hello there' }` - send a message (equivalent to returning 'hello there')
  - `{ video: '<video file ID>' }` - resend a video for which you know the file ID

- `ResponseMethod` - Any of the telegram bot API [methods](https://core.telegram.org/bots/api#available-methods). This must be an object with the `method` key set to the method name (e.g. 'sendMessage'), along with any other desired parameters. If `chat_id` is not specified, it will automatically be set to be the same as that of the incoming message
- `NoResponse` - any falsy value (including `void`) will signify that no reply should be sent.

### `InlineResponse`

An inline handler can return any of the following data types:

- Array of `InlineResult` objects, which are just like [InlineQueryResult](https://core.telegram.org/bots/api#inlinequeryresult)s but for convenience the `id` and `type` fields are optional - when not specified the ID will the array index and the type will be inferred automatically from the other parameters.
- [AnswerInlineQuery](https://core.telegram.org/bots/api#answerinlinequery) object, in case you want to specify additional options for example `cache_time`. For convenience the `inline_query_id` can be left out and will be copied from the incoming query. The results array may also contain `InlineResult` objects (i.e. the `id` and `type` fields are optional).
- `ResponseMethod` - Instead of answering the inline query, you can send any of the telegram bot API [methods](https://core.telegram.org/bots/api#available-methods). This must be an object with the `method` key set to the method name (e.g. 'sendMessage'), along with any other desired parameters. Note that since inline queries do not come from a chat, `chat_id` cannot be automatically set and must be provided by you if required
- `NoResponse` - any falsy value (or void) will signify that no reply should be sent.

## Uploading Files

There are 3 ways to send files (e.g. a photo or video), depending on where it's coming from. They are listed in order of preference:

1. By HTTP/s URL - if the file is already online somewhere, simply provide the web URL and the telegram server will download it automatically.

   E.g.: `{ photo: 'https://example.com/bird.jpg' }`

1. As a `FileBuffer` - if you are generating the file during your handler's execution, then rather than saving it to disk it is better to keep it in memory as a Buffer skip the file I/O. For this to work, a filename must be provided to the API, by using the `FileBuffer` interface. Simply return a plain object with the following 2 properties:

   - `buffer` - the Buffer object
   - `filename` - a name for the file **(including file extension!)** as a string. Do not include a path, this does not refer to a real file on disk.

   E.g.: `{ photo: { buffer: <Buffer>, filename: 'this-can-be-anything.png' } }`

1. As a local file path - if the file exists somewhere on the local file system where your function is executing, simply pass the file path (either absolute or relative to the nodejs process).

   E.g.: `{ photo: '/tmp/chart.png' }`

   It will be automatically detected as a file path rather than a file ID as long as it contains any non-alphanumeric characters, otherwise you can guarantee that it's treated as a file by sending a `file: URL`. For convinence a utility function `toFileUrl` is provided:

   ```js
   const { utils } = require('serverless-telegram');

   return { photo: utils.toFileUrl('local-file.png') };
   // equivalent to:
   return { photo: new URL(`file://${path.resolve('local-file.png')}`) };
   ```

To save the resulting file ID, see [Using the Telegram API mid-execution](#using-the-telegram-api-mid-execution)

## Using the Telegram API mid-execution

For most use cases it is enough to simply return the bot's desired response, however sometimes you might want to manually call the telegram API, for example:

- Sending a [chat action](https://core.telegram.org/bots/api#sendchataction) before you start processing
- Sending more than one response
- Using the Telegram API return value

To do so, first set the environment variable `BOT_API_TOKEN` to your bot's API token (obtainable from the BotFather). You can do this by adding it as an Application Setting to your Azure function app.

Then, use the `send` method on the `env` object passed to your handler. It takes a single argument which can be any of the [MessageResponse](#messageresponse) types (passing a `NoResponse` will of course do nothing).

It returns a promise which resolves to the response data (if any).

Example usage:

```js
// let the user know that something is happening since it might take a while
env.send({ action: 'upload_video' });
// Note: intentially *not* await-ing in this case so that work continues in parallel

// send the video
const result = await env.send({
  video: '/tmp/video.mp4',
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

## Logging

When running on Azure, your async handler functions may be executed multiple times in parallel in the same node process. In order to make sure that logging is separated per function execution, Azure requires that you use special logging methods and **not** console.log. These logging methods are included as properties of the [env](#messageenv-and-inlineenv) object passed to your handler functions on each execution, see that section for details.

## Receiving error reports

Any errors thrown by your functions are automatically caught and logged to the Azure log streams. If you wish to receive error reports in real time via telegram, pass the telegram chat ID that you want them sent to as a second argument to `createAzureTelegramWebhook`.

An easy way to find out your chat ID is to send your bot a message and check the debug logs.

## Running a local bot server during development

### TL;DR

1. Install `env-cmd` and `nodemon` either globally or as devDepenencies:
   - `npm i -g env-cmd nodemon` _, or_
   - `npm i -D env-cmd nodemon`
1. Add a `dev` script to your `package.json`:

   ```json
     "scripts": {
       ...
       "dev": "nodemon -x env-cmd start-dev-server",
       ...
     }
   ```

1. `echo 'BOT_API_TOKEN=<your dev bot's API token>' >> .env`
1. `npm run dev`

### Long version

Deploying to Azure every time you want to test your bot would be apain, which is why serverless-telegram comes with a built in **dev server**. It will use telegram's `getUpdates` method to listen for bot updates, run them through your function code, and send the response back to the bot API.

The dev server can be run by importing `startDevServer` from `serverless-telegram`, or directly from the command line by calling `npx start-dev-server`, but if you try this straight away, it will complain that the `BOT_API_TOKEN` environment variable is not set. You will need to first create a new development bot (you can't use your production bot even if you wanted to, since that bot has a webhook set which means you can't manually pull updates), and then provide its api token to the dev server via an environment variable. For example:

```sh
BOT_API_TOKEN=<your bot API token> npx start-dev-server
```

To make this easier, you can use the [env-cmd](https://www.npmjs.com/package/env-cmd) package. Install `env-cmd` either as a dev dependency or globally, then create a `.env` file at the root of your project (**and add it to your .gitignore so you don't check it in!**) with the following:

```properties
BOT_API_TOKEN=<your bot API token>
```

Now you can just run: `npx env-cmd start-dev-server`

If you want to automatically restart the server when your code changes, you can use [nodemon](https://www.npmjs.com/package/nodemon) like so: `npx nodemon -x env-cmd start-dev-server`

Now try sending a message to your dev bot in telegram and you should see it working!

By default, `start-dev-server` will search your current directory for functions and run a dev server for any that it finds, but you can change this by passing a specific function directory to run only that function, or a path to your project root if you're running from elsewhere.

An optional second argument can be passed to change the [long poll timeout](https://core.telegram.org/bots/api#getupdates)

## Using with other cloud providers (AWS, GCP, etc)

`createAzureTelegramWebhook` is internally made of two parts: `wrapTelegram` and `wrapAzure`. To use this library for other platforms besides Azure, you can use `wrapTelegram` directly and write your own http wrapper. `wrapTelegram` takes the same arguments as `createAzureTelegramWebhook`, and will return a function that takes the JSON-parsed webhook body (i.e. a telegram update object) and returns the desired response body as a JS object (not stringified).

Built in support for AWS Lambda is planned for version 0.6

# Developing serverless-telegram (via [TSDX](https://github.com/formium/tsdx))

## Initial Setup

Prerequisites:

- NodeJS v14 (to support Azure functions)
- Yarn (to support package resolutions overrides)

Clone the repo and then run `yarn install`

## Commands

TSDX scaffolds the library inside `/src`.

To run TSDX, use:

```bash
yarn start
```

This builds to `/dist` and runs the project in watch mode so any edits you save inside `src` causes a rebuild to `/dist`.

To do a one-off build, use `yarn build`.

To run tests, use `yarn test`.

To run tests in watch mode, use `yarn dev`.

## Configuration

Code quality is set up for you with `prettier`, `husky` (v3, since v4 does not support VS Code), and `lint-staged`. Adjust the respective fields in `package.json` accordingly.

### Jest

Jest tests are set up to run with `yarn test`.

### Bundle Analysis

[`size-limit`](https://github.com/ai/size-limit) is set up to calculate the real cost of your library with `npm run size` and visualize the bundle with `npm run analyze`.

### Rollup

TSDX uses [Rollup](https://rollupjs.org) as a bundler and generates multiple rollup configs for various module formats and build settings. See [Optimizations](#optimizations) for details.

### TypeScript

`tsconfig.json` is set up to interpret `dom` and `esnext` types, as well as `react` for `jsx`. Adjust according to your needs.

### Continuous Integration

### GitHub Actions

Two actions are added by default:

- `main` which installs deps w/ cache, lints, tests, and builds on all pushes against a Node and OS matrix
- `size` which comments cost comparison of your library on every pull request using [`size-limit`](https://github.com/ai/size-limit)

## Optimizations

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

## Module Formats

CJS, ESModules, and UMD module formats are supported.

The appropriate paths are configured in `package.json` and `dist/index.js` accordingly. Please report if any issues are found.

## Publishing to NPM

Run `yarn release`
