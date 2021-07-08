module.exports = {
  clearMocks: true,
  coverageDirectory: 'coverage',
  testPathIgnorePatterns: ['node_modules', '<rootDir>/dist'],
  setupFilesAfterEnv: ['./setup-jest.js'],
};
