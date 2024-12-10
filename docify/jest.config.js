/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  preset: 'ts-jest',
  transform: {
    "^.+.tsx?$": ["ts-jest",{}],
  },
  moduleFileExtensions: ['ts', 'js'],
  testMatch: ['**/?(*.)+(test).ts'],
  moduleDirectories: ['node_modules'],
  collectCoverage: true,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 95,
      statements: 95,
    }
  },
  verbose: true
};