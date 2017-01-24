var _ = require('lodash'),
    gutil = require('gulp-util');

module.exports = function setUpTask(gulp) {
  gulp.task('help', function helpTask() {
    gutil.log(gulp.metadata.describeAll());
  }, {
    description: 'List all available Gulp tasks and arguments.',
    category: 'misc',
    weight: 999
  });
}
