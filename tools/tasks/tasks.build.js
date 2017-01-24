var _ = require('lodash'),
    combine = require('stream-combiner'),
    mainBowerFiles = require('main-bower-files'),
    runSequence = require('run-sequence'),
    clean = require('gulp-clean'),
    filter = require('gulp-filter'),
    builders = require('../builders/builder-cache.js'),
    streamCache = require('../misc/stream-cache.js');

module.exports = function setUpTasks(gulp) {
  var appAssets = _.get(gulp, 'webToolsConfig.appAssets'),
      extAssets = _.get(gulp, 'webToolsConfig.extAssets'),
      hasAppAssets = !_.isEmpty(appAssets),
      hasExtAssets = !_.isEmpty(extAssets),
      extFiles;

  if (!hasAppAssets && !hasExtAssets) {
    return;
  }

  runSequence.use(gulp);

  // Main build task:
  gulp.task('build', function buildTask(done) {
    var buildTasks = _.compact([
      !_.isEmpty(appAssets) && 'build-app',
      !_.isEmpty(extAssets) && 'build-ext'
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
            builder,
            pipeline;

        if (taskDependencies.length) {
          assetDependencyStreams = {};

          _.each(appAssetDependencies.concat(extAssetDependencies), function getStream(name) {
            var stream = streamCache.get(name);

            if (!!stream) {
              assetDependencyStreams[name] = streamCache.get(name);
            }
          });
        }

        if (!assetOptions.builder) {
          builder = builders[assetType];
        } else if (_.isFunction(assetOptions.builder)) {
          builder = assetOptions.builder;
        } else {
          builder = builders[assetOptions.builder];
        }

        pipeline = combine(_.compact([
          assetOptions.build && builder && builder(assetOptions.buildOptions, assetDependencyStreams),
          assetOptions.dest && gulp.dest(assetOptions.dest),
          streamCache.put('app-' + assetType)
        ]));

        return gulp.src(assetOptions.src).pipe(pipeline);
      }, {
        description: 'Process and/or move local "' + assetType + '" assets to this project\'s destination directory',
        category: 'build'
      });
    });
  }

  if (hasExtAssets) {
    extFiles = mainBowerFiles({
      paths: {
          bowerJson: _.get(gulp, 'webToolsConfig.bower.json'),
          bowerDirectory: _.get(gulp, 'webToolsConfig.bower.components')
        }
    });

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
        var pipeline = combine(_.compact([
          filter(assetOptions.filter || '**/*.' + assetType),
          assetOptions.build && !!builders[assetType] && builders[assetType](assetOptions.buildOptions),
          assetOptions.dest && gulp.dest(assetOptions.dest),
          streamCache.put('ext-' + assetType)
        ]));

        return gulp.src(extFiles).pipe(pipeline);
      }, {
        description: 'Process and/or move external "' + assetType + '" assets to this project\'s destination directory',
        category: 'build'
      });
    });
  }
};
