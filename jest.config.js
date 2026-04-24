module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js?(x)', '**/?(*.)+(spec|test).js?(x)'],
  collectCoverage: true,
  collectCoverageFrom: ['utils/**/*.js', '!**/node_modules/**']
};
