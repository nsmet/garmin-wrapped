module.exports = {
  preset: "jest-expo/ios",
  testMatch: ["<rootDir>/tests/native/**/*.test.tsx"],
  transform: { "^.+\\.[jt]sx?$": "babel-jest", "^.+\\.mjs$": "babel-jest" },
  moduleNameMapper: { "\\.(css)$": "<rootDir>/tests/native/style.cjs" },
  testPathIgnorePatterns: ["/node_modules/", "/.build/"],
  modulePathIgnorePatterns: ["<rootDir>/.build/"],
  testTimeout: 30000,
  maxWorkers: 1,
};
