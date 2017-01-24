var _ = require('lodash'),
    runSequence = require('run-sequence');

module.exports = function setUpTask(gulp) {
  runSequence.use(gulp);

  gulp.task('default', function defaultTask(done) {
    var mainTasks = _.compact([
      _.has(gulp, 'tasks.build') && 'build',
      _.has(gulp, 'tasks.serve') && 'serve',
      _.has(gulp, 'tasks.watch') && 'watch'
    ]);

    runSequence.apply(null, mainTasks.concat(done));
  }, {
    description: 'Run the most important tasks for developing this project',
    category: 'main',
    weight: 0
  });
}
