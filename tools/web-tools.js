var _ = require('lodash'),
    args = require('yargs').argv,
    metadata = require('./gulp-metadata.js'),
    tasks = require('./gulp-tasks.js'),
    StreamCache = require('./misc/stream-cache.js');

module.exports = {
  applyTo: function (gulp, configFactory, plugins) {
      var runningTask = _.get(args, '_[0]') || 'default';

      // Get config based on the arguments given
      gulp.webToolsConfig = configFactory(runningTask, args);

      // Create a StreamCache on this instance, to help save some time down the road
      gulp.streamCache = new StreamCache();

      // Apply gulp enhancements
      metadata.applyTo(gulp);
      tasks.applyTo(gulp);

      // This prevents node from throwing a warning about memory leaks: http://stackoverflow.com/questions/9768444
      process.setMaxListeners(0);

      _.each(plugins, function plugItIn(plugin) {
        if (_.isFunction(plugin)) {
          plugin(gulp);
        }
      });

      return gulp;
    }
};
