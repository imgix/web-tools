var _ = require('lodash'),
    args = require('yargs').argv,
    metadata = require('./gulp-metadata.js'),
    tasks = require('./gulp-tasks.js'),
    StreamCache = require('./misc/stream-cache.js'),
    PipelineCache = require('./misc/pipeline-cache.js'),
    MiddlewareCache = require('./misc/middleware-cache.js');

module.exports = {
  applyTo: function (gulp, configFactory, plugins) {
      var runningTask = _.get(args, '_[0]') || 'default';

      // Get config based on the arguments given
      gulp.webToolsConfig = configFactory(gulp, runningTask, args);

      // Create a StreamCache on this instance, to help save some time down the road
      gulp.streamCache = new StreamCache();

      // Create a PipelineCache on this instance, to store pipelines
      gulp.pipelineCache = new PipelineCache(gulp);

      // Add the default pipelines to the cache
      gulp.pipelineCache.put('html', '../pipelines/pipeline.html.js');
      gulp.pipelineCache.put('css', '../pipelines/pipeline.css.js');
      gulp.pipelineCache.put('js', '../pipelines/pipeline.js.js');
      gulp.pipelineCache.put('svg', '../pipelines/pipeline.svg.js');

      // Create a MiddlewareCache on this instance, to store server middleware
      gulp.middlewareCache = new MiddlewareCache();

      // Add the default middleware to the cache
      gulp.middlewareCache.put('simple-site', '../middleware/middleware.simple-site.js');
      gulp.middlewareCache.put('single-page-app', '../middleware/middleware.single-page-app.js');

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
