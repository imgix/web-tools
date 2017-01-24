var _ = require('lodash'),
    args = require('yargs').argv,
    gulpMetadata = require('./gulp/gulp-metadata.js');

module.exports = function setupGulpTasks(gulp, configFactory) {
  var runningTask = _.get(args, '_[0]') || 'default',
      config;

  gulpMetadata.applyTo(gulp);

  // Get config based on the arguments given
  config = gulp.webToolsConfig = configFactory(runningTask, args);

  // This prevents node from throwing a warning about memory leaks: http://stackoverflow.com/questions/9768444
  process.setMaxListeners(0);

  if (_.isEmpty(config.appAssets) || _.isEmpty(config.extAssets)) {
    // Set up build tasks
    require('./tasks/tasks.build.js')(gulp);

    // Set up watch tasks
    require('./tasks/tasks.watch.js')(gulp);
  }

  if (!!config.server) {
    // Set up serve tasks
    require('./tasks/tasks.serve.js')(gulp);
  }

  require('./tasks/task.default.js')(gulp);
  require('./tasks/task.help.js')(gulp);

  if (config.versioning) {
    require('./tasks/task.version.js')(gulp);
  }

  return gulp;
};
