var _ = require('lodash'),
    runSequence = require('run-sequence'),
    args = require('yargs').argv;

module.exports = function setUpTasks(gulp) {
  var appAssets = _.get(gulp, 'webToolsConfig.appAssets'),
      extAssets = _.get(gulp, 'webToolsConfig.extAssets'),
      hasAppAssets = !_.isEmpty(appAssets),
      hasExtAssets = !_.isEmpty(extAssets),
      postBuildTasks,
      extFiles;

  if (!hasAppAssets && !hasExtAssets) {
    return;
  }

  runSequence = runSequence.use(gulp);

  function getPostBuildTasks() {
    return _.chain(gulp)
      .get('webToolsConfig.watchOptions.afterBuild', ['serve-load'])
      .castArray()
      .filter(function checkValidity(onChangeTask) {
          return _.has(gulp.tasks, onChangeTask);
        })
      .value();
  }

  // Main watch task:
  gulp.task('watch', function watchTask(done) {
    var watchTasks = _.compact([
      hasAppAssets && 'watch-app',
      hasExtAssets && 'watch-ext',
      !!args.watch && 'watch-config'
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
          var tasks = _.chain(appAssets)
            .pickBy(function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
                return _.includes(dependentAssetOptions.appAssetDependencies, assetType);
              })
            .keys()
            .tap(function unshift(list) {
                list.unshift(assetType);
              })
            .uniq()
            .map(function getBuildTaskName(assetType) {
                return 'build-app-' + assetType;
              })
            .concat(getPostBuildTasks())
            .value();

          _.spread(runSequence)(tasks);
        });
      });
    }, {
      description: 'Watch local assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'watch'
    });
  }

  if (hasExtAssets) {
    extFiles = gulp.getExt(_.get(gulp, 'webToolsConfig.extOptions'));

    gulp.task('watch-ext', function watchExtTask() {
      // Pass follow:true here to ensure symlinks are followed (for `bower link`ed components)
      gulp.watch(extFiles, {debounceDelay: 200, follow: true}, function onChange() {
        var tasks = [],
            buildTask = 'build-ext';

        // Queue a build for any app assets that have ext dependencies
        _.each(appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
          if (!_.isEmpty(dependentAssetOptions.extAssetDependencies)) {
            tasks.push('build-app-' + dependentAssetType);
          }
        });

        _.spread(runSequence)(_.concat(tasks, buildTask, getPostBuildTasks(), 'watch-ext'));
      });
    }, {
      description: 'Watch external assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'watch'
    });
  }

  if (!!args.watch) {
    gulp.task('watch-config', (done) => {
      const files = [
        '*.js', // Web-tools and gulpfile
        'misc/*.js', // Web-dashboard's server files
        'tooling/*.js', // Static sites pipelines and models
        'tooling/**/*.js',
      ];

      // Pass follow:true here to ensure symlinks are followed (for `npm link`ed components)
      gulp.watch(files, {followSymlinks: true}, (watchDone) => {
        var tasks = [],
            buildTask = 'watch-config';

        // Queue a build for any app assets that have ext dependencies
        _.each(appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
          if (!_.isEmpty(dependentAssetOptions.extAssetDependencies)) {
            tasks.push('build-app-' + dependentAssetType);
          }
        });

        let allTasks = _.concat(tasks, buildTask, getPostBuildTasks());

        return gulp.series(...allTasks, function finishBuildAppAssets(seriesDone) {
          seriesDone();
          watchDone();
        })();
      });

      done();
    }, {
      description: 'Watch server assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'watch'
    });
  }
};
