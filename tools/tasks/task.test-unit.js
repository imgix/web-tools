var _ = require('lodash'),
    merge = require('merge2'),
    mainBowerFiles = require('main-bower-files'),
    argFilter = require('./arg-filter.js'),
    unitTestPipeline = require('./test-unit.js');

module.exports = function setUpTask(gulp) {
  var testConfig = _.get(gulp, 'webToolsConfig.unitTests');

  if (!testConfig) {
    return;
  }

  gulp.task('test-unit', function testUnitTask() {
    var bowerStream,
        appStream,
        testStream;

    bowerStream = gulp.src(mainBowerFiles({
      includeDev: true,
      paths: {
          bowerJson: _.get(gulp, 'webToolsConfig.bower.json'),
          bowerDirectory: _.get(gulp, 'webToolsConfig.bower.components')
        },
      filter: '**/*.js'
    }), {read: false});

    appStream = gulp.src(testConfig.appSrc, {read: false});

    testStream = gulp.src(testConfig.testSrc, {read: false})
      .pipe(argFilter());

    return merge(
      bowerStream,
      appStream,
      testStream
    ).pipe(unitTestPipeline(testConfig.karmaOptions));
  }, {
    description: 'Run unit tests with Karma.',
    category: 'test',
    arguments: {
        'match': '[Optional] A comma-separated list of strings to match test filepaths against.'
      }
  });
}
