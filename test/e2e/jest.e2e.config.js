/** @type {import('jest').Config} */
module.exports = {
  rootDir: "../..",
  testMatch: ["<rootDir>/test/e2e/all.test.js"],
  testTimeout: 30000,
  globalSetup: "<rootDir>/test/e2e/global-setup.js",
  verbose: true,
  bail: false,
};
