const { resolve } = require('path');

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.', // This should be relative to the config file
  testEnvironment: 'node',
  testRegex: '.spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../src/$1',
    '^uuid$': require.resolve('uuid'),
  },
  setupFiles: ['<rootDir>/setup-env.ts'],
  globalSetup: '<rootDir>/global-setup.ts',
  globalTeardown: '<rootDir>/global-teardown.ts',
  transformIgnorePatterns: ['/node_modules/(?!uuid)/'],
};
