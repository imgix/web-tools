var _ = require('lodash'),
    args = require('yargs').argv,
    gulpMetadata = require('./gulp/gulp-metadata.js');

module.exports = {
  applyTo: function (gulp) {
      var config = gulp.webToolsConfig;

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
    }
};
