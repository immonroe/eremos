/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
  collectCoverageFrom: [
    'app/**/*.js',
    'config/**/*.js',
    '!**/node_modules/**',
    '!**/routes.js.backup',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
};
