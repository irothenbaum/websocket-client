export default {
  testEnvironment: 'node',
  rootDir: '../',
  verbose: true,
  testRegex: 'tests/.*(\\.|/)(test|spec)\\.[jt]s$', // we only run tests inside the tests folder -- these are our new tests
  testTimeout: 60000, // 1 minute,
}
