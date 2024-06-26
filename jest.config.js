// https://jestjs.io/docs/en/configuration.html

/** @type {import('@jest/types').Config.InitialOptions} */
export default {
  preset: 'ts-jest',
  // the code will run in node so we should also test in node (and it's faster)
  testEnvironment: 'node',
  // it's fastest to only use 1 worker (node startup is slower than the tests)
  maxWorkers: 1,
  // show code coverage on every test run
  collectCoverage: true,
  // make sure to include coverage from all files even those not tested at all
  collectCoverageFrom: ['src/**/*.{ts,js}'],
  // perform global setup steps
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
