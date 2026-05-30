module.exports = {
  testEnvironment: "jsdom",
  testPathIgnorePatterns: ["/node_modules/", "/test/e2e/"],
  transform: {
    "^.+\\.jsx?$": ["babel-jest", {
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        ["@babel/preset-react", { runtime: "automatic" }],
      ],
    }],
  },
  moduleNameMapper: {
    "\\.(css|less|png|jpg|gif|svg)$": "<rootDir>/test/__mocks__/styleMock.js",
  },
};
