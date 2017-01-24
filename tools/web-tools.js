var args = require('yargs').argv,
    gulp = require('gulp'),
    tasks = require('./gulp-tasks.js'),
    metadata = require('./gulp-metadata.js');

module.exports = function setup(configFactory, plugins) {
  var runningTask = _.get(args, '_[0]') || 'default';

  // Get config based on the arguments given
  gulp.webToolsConfig = configFactory(runningTask, args);

  gulpMetadata.applyTo(gulp);
  gulpTasks.applyTo(gulp);

  // This prevents node from throwing a warning about memory leaks: http://stackoverflow.com/questions/9768444
  process.setMaxListeners(0);

  _.each(plugins, function plugItIn(plugin) {
    if (_.isFunction(plugin)) {
      plugin(gulp);
    }
  });

  return gulp;
};
