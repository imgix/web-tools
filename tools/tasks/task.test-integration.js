var _ = require('lodash'),
    URI = require('uri.js'),
    merge = require('merge2'),
    mainBowerFiles = require('main-bower-files'),
    argFilter = require('./arg-filter.js'),
    integrationTestPipeline = require('./test-integration.js');

module.exports = function setUpTask(gulp) {
  var testConfig = _.get(gulp, 'webToolsConfig.integrationTests'),
      serverConfig = _.get(gulp, 'webToolsConfig.server'),
      serverURL;

  if (!testConfig || !serverConfig) {
    return;
  }

  serverURL = URI(serverConfig).href();

  runSequence.use(gulp);

  gulp.task('test-integration', function testIntegrationTask(done) {
    runSequence(
      'build',
      'serve-start',
      'test-integration-run',
      'serve-stop',
      done
    );
  }, {
    description: 'Initialize, run, and clean up integration tests (including visual regression tests) with Selenium and Webdriver.',
    notes: ['This task will override the `env` argument and always run in the `test` environment.'],
    category: 'test',
    arguments: {
        'match': '[Optional] Only test files with names containing the given string will be run.'
      }
  });

  gulp.task('test-integration-run', function testIntegrationRunTask() {
    // Set up stream, with filtration
    return gulp.src(testConfig.testSrc, {read: false})
      .pipe(argFilter())
      .pipe(integrationTestPipeline(testConfig, serverURL));
  }, {
    description: 'Initialize and run integration tests (including visual regression tests) with Selenium and Webdriver.',
    category: 'test',
    arguments: {
        'match': '[Optional] Only test files with names containing the given string will be run.'
      }
  });
}
