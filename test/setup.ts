import * as nock from 'nock';

// supress debug & info console logs - comment this out when debugging
Object.assign(console, { debug: jest.fn(), info: jest.fn() });

// global settings for nock
nock.back.fixtures = __dirname + '/__fixtures__/';
nock.back.setMode(process.env.CI ? 'lockdown' : 'record');

// when running in watch mode we need to reset nock after each run
afterAll(nock.restore);
