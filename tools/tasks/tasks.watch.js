var _ = require('lodash'),
    runSequence = require('run-sequence'),
    mainBowerFiles = require('main-bower-files');

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

  // Main watch task:
  gulp.task('watch', function watchTask(done) {
    var watchTasks = _.compact([
      hasAppAssets && 'watch-app',
      hasExtAssets && 'watch-ext'
    ]);

    runSequence(watchTasks, done);
  }, {
    description: 'Watch all assets and automatically build and reload the browser when a change is made.',
    notes: ['This task will run indefinitely until it is killed.'],
    category: 'main',
    weight: 3
  });

  if (hasAppAssets) {
    gulp.task('watch-app', function watchAppTask() {
      // Set up a watcher for each app asset type
      _.each(appAssets, function addAppWatcher(assetOptions, assetType) {
        gulp.watch(assetOptions.src, function onChange() {
          var tasks = [],
              buildTasks = ['build-app-' + assetType];

          // Queue a build for any other assets that are dependent on this one
          _.each(appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
            if (_.includes(dependentAssetOptions.appAssetDependencies, assetType)) {
              tasks.push('build-app-' + dependentAssetType);
            }
          });

          tasks.push(buildTasks);

          if (_.has(gulp, 'tasks["serve-load"]') && _.has(gulp, 'webToolsConfig.server.instance')) {
            tasks.push('serve-load');
          }

          runSequence.apply(null, tasks);
        });
      });
    }, {
      description: 'Watch local assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'watch'
    });
  }

  if (hasExtAssets) {
    extFiles = mainBowerFiles({
      paths: {
          bowerJson: _.get(gulp, 'webToolsConfig.bower.json'),
          bowerDirectory: _.get(gulp, 'webToolsConfig.bower.components')
        }
    });

    gulp.task('watch-ext', function watchExtTask() {
      // Pass follow:true here to ensure symlinks are followed (for `bower link`ed components)
      gulp.watch(extFiles, {follow: true}, function onChange() {
        var tasks = [],
            buildTasks = ['build-ext'];

        // Queue a build for any app assets that have ext dependencies
        _.each(appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
          if (!_.isEmpty(dependentAssetOptions.extAssetDependencies)) {
            tasks.push('build-app-' + dependentAssetType);
          }
        });

        tasks.push(buildTasks);

        if (_.has(gulp, 'tasks["serve-load"]') && _.has(gulp, 'webToolsConfig.server.instance')) {
          tasks.push('serve-load');
        }

        runSequence.apply(null, tasks);
      });
    }, {
      description: 'Watch external assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'watch'
    });
  }
};
