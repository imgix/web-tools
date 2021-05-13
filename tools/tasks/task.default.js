var _ = require('lodash'),
    runSequence = require('gulp4-run-sequence');

module.exports = function setUpTask(gulp) {
  runSequence = runSequence.use(gulp);

  gulp.task('default', gulp.series(function defaultTask(done) {
    var mainTasks = _.compact([
      _.has(gulp, '_registry._tasks.build') && 'build',
      _.has(gulp, '_registry._tasks.serve') && 'serve',
      _.has(gulp, '_registry._tasks.watch') && 'watch'
    ]);

    runSequence.apply(null, mainTasks.concat(done));
  }), {
    description: 'Run the most important tasks for developing this project',
    category: 'main',
    weight: 0
  });
};
