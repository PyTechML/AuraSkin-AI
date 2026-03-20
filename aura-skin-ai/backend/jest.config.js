module.exports = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: ".",
  testRegex: ".*\\.(spec|e2e-spec)\\.ts$",
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  collectCoverageFrom: ["src/**/*.(t|j)s", "!src/main.ts"],
  coverageDirectory: "./coverage",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@config/(.*)$": "<rootDir>/src/config/$1",
    "^@core/(.*)$": "<rootDir>/src/core/$1",
    "^@shared/(.*)$": "<rootDir>/src/shared/$1",
    "^@database/(.*)$": "<rootDir>/src/database/$1",
    "^@modules/(.*)$": "<rootDir>/src/modules/$1",
    "^@ai/(.*)$": "<rootDir>/src/ai/$1",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@jobs/(.*)$": "<rootDir>/src/jobs/$1",
  },
};
