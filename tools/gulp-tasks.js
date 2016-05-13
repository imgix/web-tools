var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    merge = require('merge2'),
    combine = require('stream-combiner'),
    args = require('yargs').argv,
    mainBowerFiles = require('main-bower-files'),
    gutil = require('gulp-util'),
    builders = require('./builders.js'),
    streamCache = require('./stream-cache.js'),
    runCommand = require('./run-command.js');

module.exports = function setupGulpTasks(gulp, configFactory) {
  var runningTask,
      config,
      hasAppAssets,
      hasExtAssets,
      getExternalFiles,
      getServerURL,
      appServer,
      runSequence,
      gulpPlugins,
      gulpMetadata;

  runningTask = _.get(args, '_[0]') || 'default';

  // Get config based on the arguments given
  config = configFactory(runningTask, args);

  // Set global vars at outset
  hasAppAssets = !_.isEmpty(config.appAssets);
  hasExtAssets = !_.isEmpty(config.extAssets);

  // We can't set up these dependencies without Gulp being defined first
  runSequence = require('run-sequence').use(gulp);
  gulpMetadata = require('./gulp-metadata.js')(gulp);
  gulpPlugins = require('gulp-load-plugins')();

  // Parsing the bower.json file is expensive, so only invoke this function once
  getExternalFiles = _.once(function getExternalFilesOnce() {
    return mainBowerFiles({
      paths: {
          bowerJson: config.bower.json,
          bowerDirectory: config.bower.components
        }
    });
  });

  // This function should only be invoked once per config object
  getServerURL = _.memoize(function getAppURLOnce(serverConfig) {
    var protocol = serverConfig.ssl ? 'https' : 'http',
        hostname = serverConfig.hostname,
        port = serverConfig.port ? (':' + serverConfig.port) : '';

    return protocol + '://' + hostname + port;
  }, JSON.stringify);

  // This prevents node from throwing a warning about memory leaks: http://stackoverflow.com/questions/9768444
  process.setMaxListeners(0);

  /*--- Build Tasks ---*/
  if (hasAppAssets || hasExtAssets) {
    // Main build task:
    gulp.task('build', function buildTask(done) {
      var buildTasks = _.compact([
        !_.isEmpty(config.appAssets) && 'build-app',
        !_.isEmpty(config.extAssets) && 'build-ext'
      ]);

      runSequence(
        'build-clean',
        buildTasks,
        done
      );
    });
    gulpMetadata.addTask('build', {
      description: 'Process and/or move all assets to this project\'s destination directory',
      category: 'main',
      weight: 1
    });

    // Task to clean destination
    gulp.task('build-clean', function buildCleanTask() {
      return gulp.src(config.destPath, {read: false})
        .pipe(gulpPlugins.clean());
    });
    gulpMetadata.addTask('build-clean', {
      description: 'Clear and delete the destination directory of this project\'s build process.',
      category: 'build'
    });

    if (hasAppAssets) {
      // Main app-asset build task:
      gulp.task('build-app', function buildAppTask(done) {
        var tasks = _.map(config.appAssets, function prefix(assetOptions, assetType) {
          return 'build-app-' + assetType;
        });

        runSequence(
          tasks,
          done
        );
      });
      gulpMetadata.addTask('build-app', {
        description: 'Process and/or move all local assets to this project\'s destination directory',
        category: 'build'
      });

      // Set up build task for each app asset type
      _.each(config.appAssets, function addAppBuildTask(assetOptions, assetType) {
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
        });
        gulpMetadata.addTask('build-app-' + assetType, {
          description: 'Process and/or move local "' + assetType + '" assets to this project\'s destination directory',
          category: 'build'
        });
      });
    }

    if (hasExtAssets) {
      // Main external-asset build task:
      gulp.task('build-ext', function buildExtTask(done) {
        var tasks = _.map(config.extAssets, function prefix(assetOptions, assetType) {
          return 'build-ext-' + assetType;
        });

        runSequence(
          tasks,
          done
        );
      });
      gulpMetadata.addTask('build-ext', {
        description: 'Process and/or move all external assets to this project\'s destination directory',
        category: 'build'
      });

      // Set up build task for each ext asset type
      _.each(config.extAssets, function addExtBuildTask(assetOptions, assetType) {
        gulp.task('build-ext-' + assetType, function task() {
          var pipeline = combine(_.compact([
            gulpPlugins.filter(assetOptions.filter || '**/*.' + assetType),
            assetOptions.build && !!builders[assetType] && builders[assetType](assetOptions.buildOptions),
            assetOptions.dest && gulp.dest(assetOptions.dest),
            streamCache.put('ext-' + assetType)
          ]));

          return gulp.src(getExternalFiles()).pipe(pipeline);
        });
        gulpMetadata.addTask('build-ext-' + assetType, {
          description: 'Process and/or move external "' + assetType + '" assets to this project\'s destination directory',
          category: 'build'
        });
      });
    }
  }

  /*--- Serve Tasks ---*/
  if (!!config.server) {
    // Main serve task:
    gulp.task('serve', function serveTask(done) {
      runSequence(
        'serve-start',
        'serve-load',
        done
      );
    });
    gulpMetadata.addTask('serve', {
      description: 'Start a local server for this project and view it in Chrome.',
      notes: ['The task will finish once the server has started, but the server will run in the background until the `stop-server` task is called.'],
      category: 'main',
      weight: 2
    });

    gulp.task('serve-start', function serveStartTask(done) {
      var express = require('express'),
          app;

      // If the server is already running, no need to do anything
      if (appServer) {
        done();
        return;
      }

      app = express();
      app.use(express.static(config.destPath));

      if (config.appAssets.html) {
        app.get('*', function respond(request, response) {
          response.sendFile('index.html', {
            root: config.appAssets.html.dest
          });
        });
      }

      if (config.server.ssl) {
        appServer = require('https').createServer({
          key: fs.readFileSync(config.server.key),
          cert: fs.readFileSync(config.server.cert),
          requestCert: false,
          rejectUnauthorized: false
        }, app);
      } else {
        appServer = require('http').createServer(app);
      }

      appServer.listen(config.server.port, done);
    });
    gulpMetadata.addTask('serve-start', {
      description: 'Start a local server for this project.',
      notes: ['The task will finish once the server has started, but the server will run in the background until the `stop-server` task is called.'],
      category: 'serve'
    });

    gulp.task('serve-stop', function serveStopTask() {
      if (appServer) {
        appServer.close();
        appServer = undefined;
      }
    });
    gulpMetadata.addTask('serve-stop', {
      description: 'Shut down the local server for this project, if it\'s running.',
      category: 'serve'
    });

    gulp.task('serve-load', function serveLoadTask() {
      return require('./chrome-load.js')(getServerURL(config.server));
    });
    gulpMetadata.addTask('serve-load', {
      description: 'Reload existing Chrome tabs that are pointing to the local server, or open a new tab if none exists.',
      category: 'serve'
    });
  }

  /*--- Watch Tasks ---*/
  if (hasAppAssets || hasExtAssets) {
    // Main watch task:
    gulp.task('watch', function watchTask(done) {
      var watchTasks = _.compact([
        hasAppAssets && 'watch-app',
        hasExtAssets && 'watch-ext'
      ]);

      runSequence(watchTasks, done);
    });
    gulpMetadata.addTask('watch', {
      description: 'Watch all assets and automatically build and reload the browser when a change is made.',
      notes: ['This task will run indefinitely until it is killed.'],
      category: 'main',
      weight: 3
    });

    if (hasAppAssets) {
      gulp.task('watch-app', function watchAppTask() {
        // Set up a watcher for each app asset type
        _.each(config.appAssets, function addAppWatcher(assetOptions, assetType) {
          gulp.watch(assetOptions.src, function onChange() {
            var tasks = [],
                buildTasks = ['build-app-' + assetType];

            // Queue a build for any other assets that are dependent on this one
            _.each(config.appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
              if (_.includes(dependentAssetOptions.appAssetDependencies, assetType)) {
                tasks.push('build-app-' + dependentAssetType);
              }
            });

            tasks.push(buildTasks);

            if (!!config.server && !!appServer) {
              tasks.push('serve-load');
            }

            runSequence.apply(null, tasks);
          });
        });
      });
      gulpMetadata.addTask('watch-app', {
        description: 'Watch local assets and automatically build and reload the browser when a change is made.',
        notes: ['This task will run indefinitely until it is killed.'],
        category: 'watch'
      });
    }

    if (hasExtAssets) {
      gulp.task('watch-ext', function watchExtTask() {
        // Pass follow:true here to ensure symlinks are followed (for `bower link`ed components)
        gulp.watch(getExternalFiles(), {follow: true}, function onChange() {
          var tasks = [],
              buildTasks = ['build-ext'];

          // Queue a build for any app assets that have ext dependencies
          _.each(config.appAssets, function examineAppDependencies(dependentAssetOptions, dependentAssetType) {
            if (!_.isEmpty(dependentAssetOptions.extAssetDependencies)) {
              tasks.push('build-app-' + dependentAssetType);
            }
          });

          tasks.push(buildTasks);

          if (!!config.server && !!appServer) {
            tasks.push('serve-load');
          }

          runSequence.apply(null, tasks);
        });
      });
      gulpMetadata.addTask('watch-ext', {
        description: 'Watch external assets and automatically build and reload the browser when a change is made.',
        notes: ['This task will run indefinitely until it is killed.'],
        category: 'watch'
      });
    }
  }

  /*--- Test Tasks ---*/
  if (!!config.unitTests || !!config.integrationTests) {
    // Main test task:
    gulp.task('test', function testTask(done) {
      var testTasks = _.compact([
        !!config.unitTests && 'test-unit',
        !!config.integrationTests && 'test-integration'
      ]);

      runSequence(testTasks, done);
    });
    gulpMetadata.addTask('test', {
      description: 'Run all tests for this project',
      category: 'main',
      weight: 4,
      arguments: {
          'match': '[Optional] A comma-separated list of strings to match test filepaths against.'
        }
    });

    if (!!config.unitTests) {
      gulp.task('test-unit', function testUnitTask() {
        var argFilterPipeline = require('./arg-filter.js'),
            testUnitPipeline = require('./test-unit.js'),
            bowerStream,
            appStream,
            testStream;

        bowerStream = gulp.src(mainBowerFiles({
            includeDev: true,
            paths: {
                bowerDirectory: config.bower.components,
                bowerJson: config.bower.json
              },
            filter: '**/*.js'
          }));

        appStream = merge([
          gulp.src(_.get(config, 'appAssets.js.src'), {read: false}),
          gulp.src(_.get(config, 'appAssets.templates.src'), {read: false})
        ]);

        testStream = gulp.src(config.unitTests.src, {read: false})
          .pipe(argFilterPipeline(args));

        return merge(
          bowerStream,
          appStream,
          testStream
        ).pipe(testUnitPipeline(config.unitTests.karmaOptions));
      });
      gulpMetadata.addTask('test-unit', {
        description: 'Run unit tests with Karma.',
        category: 'test',
        arguments: {
            'match': '[Optional] A comma-separated list of strings to match test filepaths against.'
          }
      });
    }

    if (!!config.integrationTests) {
      gulp.task('test-integration', function testIntegrationTask(done) {
        runSequence(
          'build',
          'serve-start',
          'test-integration-run',
          'serve-stop',
          done
        );
      });
      gulpMetadata.addTask('test-integration', {
        description: 'Initialize, run, and clean up integration tests (including visual regression tests) with Selenium and Webdriver.',
        notes: ['This task will override the `env` argument and always run in the `test` environment.'],
        category: 'test',
        arguments: {
            'match': '[Optional] Only test files with names containing the given string will be run.'
          }
      });

      gulp.task('test-integration-run', function testIntegrationRunTask() {
        var argFilterPipeline = require('./arg-filter.js'),
            testIntegrationPipeline = require('./test-integration.js');

        // Set up stream, with filtration
        return gulp.src(config.integrationTests.src, {read: false})
          .pipe(argFilterPipeline(args))
          .pipe(testIntegrationPipeline(config.integrationTests, getServerURL(config.server)));
      });
      gulpMetadata.addTask('test-integration-run', {
        description: 'Initialize and run integration tests (including visual regression tests) with Selenium and Webdriver.',
        category: 'test',
        arguments: {
            'match': '[Optional] Only test files with names containing the given string will be run.'
          }
      });
    }
  }

  /*--- Deploy Task ---*/
  if (!!config.deployment) {
    gulp.task('deploy', function deployTask() {
      var lines,
          templateData,
          compiledCommand;

      // Merge command-line args into config settings
      templateData = _.merge({
        args: _.pick(args, [
            'staging',
            'branch',
            'commit'
          ])
      }, config.deployment);

      lines = [
        // Get version for loko and ansible
        (args.commit ?
          'VERSION=<%= args.commit %>' :
          'VERSION=`git ls-remote <%= repository.url %> <%= args.branch || repository.branch || "master" %> | cut -f 1`'),

        // Publish loko package
        'loko -D publish <%= loko.package %> \\$VERSION',

        // Move to ansible-repo directory
        'cd /repos/ansible-repo',

        // Run ansible playbook
        'ansible-playbook -e loko_version=\\$VERSION -e prefix=<%= args.staging ? "stage" : "prod" %> <%= ansible.configFile %>'
      ];

      // Looks like this: ssh [server] "[line1] && [line2] && ..."
      compiledCommand = _.template('ssh <%= jumpServer %> "' + lines.join(' && ') + '"')(templateData);

      return runCommand(compiledCommand);
    });
    gulpMetadata.addTask('deploy', {
      description: 'Publish, configure and deploy code on remote servers using Loko and Ansible.',
      category: 'deploy',
      arguments: {
          'staging': '[Optional] Target only prefix=stage machines for this deploy.',
          'branch': '[Optional] Deploy from the tip of a specific branch. Defaults to "master".',
          'commit': '[Optional] Deploy from a specific commit rather than a branch tip.'
        }
    });

    gulp.task('rollback', function deployTask() {
      var lines,
          templateData,
          compiledCommand;

      // Merge command-line args into config settings
      templateData = _.merge({
        args: _.pick(args, [
            'staging',
            'rel'
          ])
      }, config.deployment);

      lines = [
        // Get the prior version for loko and ansible
        'VERSION=`curl http://sjc1-loko-api.prod.imgix.com:8090/v1/releases/<%= loko.package %> | python -c \'import sys, json; print json.load(sys.stdin)["recent"][<%= args.rel ? (args.rel - 1) : 0 %>]\'`',

        // Move to ansible-repo directory
        'cd /repos/ansible-repo',

        // Run ansible playbook
        'ansible-playbook -e loko_version=\\$VERSION -e prefix=<%= args.staging ? "stage" : "prod" %> <%= ansible.configFile %>',

        // Rollback loko package
        'loko -D rollback -r<%= args.rel || "1" %> <%= loko.package %>'
      ];

      // Looks like this: ssh [server] "[line1] && [line2] && ..."
      compiledCommand = _.template('ssh <%= jumpServer %> "' + lines.join(' && ') + '"')(templateData);

      return runCommand(compiledCommand);
    });
    gulpMetadata.addTask('rollback', {
      description: 'Rollback a deployment on remote servers using Loko and Ansible.',
      category: 'deploy',
      arguments: {
          'staging': '[Optional] Target only prefix=stage machines for this rollback.',
          'rel': '[Optional] Rollback this many versions. Max is 5, defaults to 1.'
        }
    });
  }

  /*--- Default Task ---*/
  gulp.task('default', function defaultTask(done) {
    var mainTasks = _.compact([
      !!gulp.tasks.build && 'build',
      !!gulp.tasks.serve && 'serve',
      !!gulp.tasks.watch && 'watch'
    ]);

    runSequence.apply(null, mainTasks.concat(done));
  });
  gulpMetadata.addTask('default', {
    description: 'Run the most important tasks for developing this project',
    category: 'main',
    weight: 0
  });

  /*--- Misc. Tasks ---*/

  if (config.versioning) {
    gulp.task('version', function versionTask() {
      var versionBump = require('./version-bump.js');

      return gulp.src(config.versioning.src, {base: '.'})
        .pipe(versionBump(args.bump))
        .pipe(gulp.dest('.'));
    });
    gulpMetadata.addTask('version', {
      description: 'Bump this project\'s semantic version number.',
      category: 'misc',
      arguments: {
          'bump': '[Optional] Specifies which part of the version number (major, minor, patch) should be bumped.'
        }
    });
  }

  gulp.task('help', function helpTask() {
    gutil.log(gulpMetadata.describeAll());
  });
  gulpMetadata.addTask('help', {
    description: 'List all available Gulp tasks and arguments.',
    category: 'misc',
    weight: 999
  });

  return gulp;
};
