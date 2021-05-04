var _ = require('lodash'),
    gutil = require('gulp-util');

module.exports = function setUpTask(gulp) {
  gulp.task('help', gulp.series(function help(done) {
    gutil.log(gulp.metadata.describeAll());
    done();
  }), {
    description: 'List all available Gulp tasks and arguments.',
    category: 'misc',
    weight: 999
  });
};
