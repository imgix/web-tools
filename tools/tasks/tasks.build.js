var _ = require('lodash'),
    combine = require('stream-combiner'),
    runSequence = require('run-sequence'),
    clean = require('gulp-clean'),
    filter = require('gulp-filter'),
    getExt = require('../misc/get-ext.js');

module.exports = function setUpTasks(gulp) {
  var appAssets = _.get(gulp, 'webToolsConfig.appAssets'),
      extAssets = _.get(gulp, 'webToolsConfig.extAssets'),
      hasAppAssets = !_.isEmpty(appAssets),
      hasExtAssets = !_.isEmpty(extAssets),
      extFiles;

  if (!hasAppAssets && !hasExtAssets) {
    return;
  }

  runSequence = runSequence.use(gulp);

  // Main build task:
  gulp.task('build', function buildTask(done) {
    var buildTasks = _.compact([
      hasAppAssets && 'build-app',
      hasExtAssets && 'build-ext'
    ]);

    runSequence(
      'build-clean',
      buildTasks,
      done
    );
  }, {
    description: 'Process and/or move all assets to this project\'s destination directory',
    category: 'main',
    weight: 1
  });

  // Task to clean destination
  gulp.task('build-clean', function buildCleanTask() {
    var destPath = _.get(gulp, 'webToolsConfig.destPath');

    if (destPath) {
      return gulp.src(destPath, {read: false})
        .pipe(clean());
    }
  }, {
    description: 'Clear and delete the destination directory of this project\'s build process.',
    category: 'build'
  });

  if (hasAppAssets) {
    // Main app-asset build task:
    gulp.task('build-app', function buildAppTask(done) {
      var tasks = _.map(appAssets, function prefix(assetOptions, assetType) {
        return 'build-app-' + assetType;
      });

      runSequence(
        tasks,
        done
      );
    }, {
      description: 'Process and/or move all local assets to this project\'s destination directory',
      category: 'build'
    });

    // Set up build task for each app asset type
    _.each(appAssets, function addAppBuildTask(assetOptions, assetType) {
      var appAssetDependencies,
          extAssetDependencies,
          taskDependencies = [];

      function prefixAssetType(prefix, assetType) {
        var prefixed = prefix + '-' + assetType;
        taskDependencies.push('build-' + prefixed);
        return prefixed;
      }

      appAssetDependencies = _.map(assetOptions.appAssetDependencies, _.partial(prefixAssetType, 'app'));
      extAssetDependencies = _.map(assetOptions.extAssetDependencies, _.partial(prefixAssetType, 'ext'));

      gulp.task('build-app-' + assetType, taskDependencies, function task() {
        var assetDependencyStreams,
            assetStreams,
            fullPipeline;

        if (taskDependencies.length) {
          assetDependencyStreams = {};

          _.each(appAssetDependencies.concat(extAssetDependencies), function getStream(name) {
            var stream = gulp.streamCache.get(name);

            if (!!stream) {
              assetDependencyStreams[name] = stream;
            }
          });
        }

        assetStreams = _.map(assetOptions.pipelines || [], function getStream(settings) {
          var pipeline;

          if (_.isFunction(settings.pipeline)) {
            pipeline = settings.pipeline(gulp);
          } else if (_.isString(settings.pipeline)) {
            pipeline = gulp.pipelineCache.get(settings.pipeline);
          }

          if (!_.isFunction(pipeline)) {
            return;
          }

          return pipeline(settings.options || {}, assetDependencyStreams);
        });

        fullPipeline = combine(
          _.chain(assetStreams)
            .concat([
                assetOptions.dest && gulp.dest(assetOptions.dest),
                gulp.streamCache.put('app-' + assetType)
              ])
            .compact()
            .value()
        );

        return gulp.src(assetOptions.src).pipe(fullPipeline);
      }, {
        description: 'Process and/or move local "' + assetType + '" assets to this project\'s destination directory',
        category: 'build'
      });
    });
  }

  if (hasExtAssets) {
    extFiles = getExt(_.get(gulp, 'webToolsConfig.extOptions'));

    // Main external-asset build task:
    gulp.task('build-ext', function buildExtTask(done) {
      var tasks = _.map(extAssets, function prefix(assetOptions, assetType) {
        return 'build-ext-' + assetType;
      });

      runSequence(
        tasks,
        done
      );
    }, {
      description: 'Process and/or move all external assets to this project\'s destination directory',
      category: 'build'
    });

    // Set up build task for each ext asset type
    _.each(extAssets, function addExtBuildTask(assetOptions, assetType) {
      gulp.task('build-ext-' + assetType, function task() {
        var assetStreams,
            fullPipeline;

        assetStreams = _.map(assetOptions.pipelines || [], function getStream(settings) {
          var pipeline;

          if (_.isFunction(settings.pipeline)) {
            pipeline = settings.pipeline;
          } else if (_.isString(settings.pipeline)) {
            pipeline = gulp.pipelineCache.get(settings.pipeline);
          } else {
            return;
          }

          return pipeline(settings.options || {});
        });

        fullPipeline = combine(
          _.chain(filter(assetOptions.filter || '**/*.' + assetType))
            .concat([
                assetStreams,
                assetOptions.dest && gulp.dest(assetOptions.dest),
                gulp.streamCache.put('ext-' + assetType)
              ])
            .flatten()
            .compact()
            .value()
        );

        return gulp.src(extFiles).pipe(fullPipeline);
      }, {
        description: 'Process and/or move external "' + assetType + '" assets to this project\'s destination directory',
        category: 'build'
      });
    });
  }
};
