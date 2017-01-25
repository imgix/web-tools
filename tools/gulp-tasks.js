var _ = require('lodash');

module.exports = {
  applyTo: function (gulp) {
      if (_.has(gulp, 'webToolsConfig.appAssets') || _.has(gulp, 'webToolsConfig.extAssets')) {
        // Set up build tasks
        require('./tasks/tasks.build.js')(gulp);

        // Set up watch tasks
        require('./tasks/tasks.watch.js')(gulp);
      }

      if (!!_.has(gulp, 'webToolsConfig.server')) {
        // Set up serve tasks
        require('./tasks/tasks.serve.js')(gulp);
      }

      require('./tasks/task.default.js')(gulp);
      require('./tasks/task.help.js')(gulp);

      if (_.has(gulp, 'webToolsConfig.versioning')) {
        require('./tasks/task.version.js')(gulp);
      }

      return gulp;
    }
};
