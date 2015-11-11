var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    merge = require('merge2'),
    args = require('yargs').argv,
    runSequence,
    loadPlugins = require('gulp-load-plugins'),
    mainBowerFiles = require('main-bower-files'),
    streamCache = require('./stream-cache.js');

module.exports = function setupGulpTasks(gulp, configFactory, taskOptions) {
  var config,
      localURL,
      server,
      plugins;

  function setConfig(withArgs) {
    config = configFactory(withArgs);
  }

  // We can't require runSequence without Gulp being defined first
  runSequence = require('run-sequence').use(gulp);

  // Set global config at outset
  setConfig(args);

  taskOptions = _.defaultsDeep({}, taskOptions, {
    build: { // Set to false to ignore all build tasks
        js: !!config.srcFiles.js,
        templates: !!config.srcFiles.templates,
        css: !!config.srcFiles.css,
        svg: !!config.srcFiles.svg,
        partials: !!config.srcFiles.partials,
        misc: !!config.srcFiles.misc,
        html: !!config.srcFiles.html,
        deps: !!config.bower
      },
    watch: { // Set to false to ignore watch tasks
        js: !!config.srcFiles.js,
        templates: !!config.srcFiles.templates,
        css: !!config.srcFiles.css,
        svg: !!config.srcFiles.svg,
        partials: !!config.srcFiles.partials,
        misc: !!config.srcFiles.misc,
        html: !!config.srcFiles.html,
        deps: !!config.bower
      },
    serve: !!config.server, // Set to false to ignore server tasks
    test: { // Set to false to ignore testing tasks
        unit: !!config.testFiles.unit,
        integration: !!config.testFiles.integration
      }
  });

  // Lazy-load plugins
  plugins = loadPlugins();

  localURL = (function getAppUrl() {
    var protocol,
        hostname,
        port;

    if (config.server) {
      protocol = config.server.ssl ? 'https' : 'http';
      hostname = config.server.hostname;
      port = config.server.port ? (':' + config.server.port) : '';

      return protocol + '://' + hostname + port;
    }
  })();

  // This prevents node from throwing a warning about memory leaks: http://stackoverflow.com/questions/9768444
  process.setMaxListeners(0);

  /*--- Default Task ---*/
  gulp.task('default', function(done) {
    var tasks = _.compact([
      !!taskOptions.build ? 'build' : undefined,
      !!taskOptions.serve ? 'serve' : undefined,
      !!taskOptions.watch ? 'watch' : undefined,
      done
    ]);

    runSequence.apply(null, tasks);
  });


  /*--- Build Tasks ---*/
  if (!!taskOptions.build) {

    // Main build task:
    gulp.task('build', function(done) {
      var buildTasks = _.compact([
        taskOptions.build.js ? 'build-js' : null,
        taskOptions.build.templates ? 'build-templates' : null,
        taskOptions.build.css ? 'build-css' : null,
        taskOptions.build.svg ? 'build-svg' : null,
        taskOptions.build.partials ? 'build-partials' : null,
        taskOptions.build.misc ? 'build-misc' : null,
        taskOptions.build.html ? 'build-html' : null,
        taskOptions.build.deps ? 'build-deps' : null,
      ]);

      runSequence(
        'clean',
        buildTasks,
        done
      );
    });

    // The following tasks should only need to be called directly when diagnosing build problems

    gulp.task('clean', function() {
      return gulp.src(config.destPaths.base, {read: false})
        .pipe(plugins.clean());
    });

    if(taskOptions.build.js) {
      gulp.task('build-js', function() {
        var buildJS = require('./build-js.js');

        return gulp.src(config.srcFiles.js)
          .pipe(buildJS(config.buildOptions.js))
          .pipe(gulp.dest(config.destPaths.js))
          .pipe(streamCache.put('js'));
      });
    }

    if(taskOptions.build.templates) {
      gulp.task('build-templates', function() {
        var buildTemplates = require('./build-templates.js');

        return gulp.src(config.srcFiles.templates)
          .pipe(buildTemplates(config.buildOptions.templates))
          .pipe(gulp.dest(config.destPaths.templates))
          .pipe(streamCache.put('templates'));
      });
    }

    if(taskOptions.build.css) {
      gulp.task('build-css', function() {
        var buildCSS = require('./build-css.js');

        return gulp.src(config.srcFiles.css)
          .pipe(buildCSS(config.buildOptions.css))
          .pipe(gulp.dest(config.destPaths.css))
          .pipe(streamCache.put('css'));
      });
    }

    if(taskOptions.build.svg) {
      gulp.task('build-svg', function() {
        var buildSVG = require('./build-svg.js');

        return gulp.src(config.srcFiles.svg)
          .pipe(buildSVG(config.buildOptions.svg))
          .pipe(gulp.dest(config.destPaths.svg))
          .pipe(streamCache.put('svg'));
      });
    }

    if(taskOptions.build.partials) {
      gulp.task('build-partials', function() {
        var buildPartials = require('./build-partials.js');

        return gulp.src(config.srcFiles.partials)
          .pipe(buildPartials(config.buildOptions.partials))
          .pipe(gulp.dest(config.destPaths.partials))
          .pipe(streamCache.put('partials'));
      });
    }

    if(taskOptions.build.misc) {
      gulp.task('build-misc', function() {
        return gulp.src(config.srcFiles.misc)
          .pipe(gulp.dest(config.destPaths.misc))
          .pipe(streamCache.put('misc'));
      });
    }

    if(taskOptions.build.html) {
      gulp.task('build-html',
        _.compact([ // List of tasks that must execute first
            taskOptions.build.js ? 'build-js' : null,
            taskOptions.build.templates ? 'build-templates' : null,
            taskOptions.build.css ? 'build-css' : null,
            taskOptions.build.svg ? 'build-svg' : null,
            taskOptions.build.partials ? 'build-partials' : null,
            taskOptions.build.deps ? 'build-deps' : null,
          ]),
        function() {
          var buildHTML = require('./build-html.js'),
              assetStreams = {};

          // Combine app assets into a single injectable stream
          assetStreams.app = merge(_.compact([
            streamCache.get('js'),
            streamCache.get('templates'),
            streamCache.get('css'),
            streamCache.get('svg'),
            streamCache.get('partials')
          ]));

          if (taskOptions.build.deps) {
            assetStreams.deps = streamCache.get('deps');
          }

          return gulp.src(config.srcFiles.svg)
            // Pipe to destination before processing so the injected assets will have the correct relative URLs
            .pipe(gulp.dest(config.destPaths.html))
            .pipe(buildHTML(config.buildOptions.html, assetStreams))
            .pipe(gulp.dest(config.destPaths.html))
            .pipe(streamCache.put('html'));
        }
      );
    }

    if (taskOptions.build.deps) {
      gulp.task('build-deps', function() {
        var bowerStream = gulp.src(mainBowerFiles({
                paths: {
                    bowerJson: config.bower.json,
                    bowerDirectory: config.bower.components
                  }
              })),
            destStreams = {},
            buildCSS = require('./build-css.js'),
            buildJS = require('./build-js.js');

        // Build JS
        destStreams.js = bowerStream
          .pipe(plugins.filter('**/*.js'))
          .pipe(buildJS(_.defaults({
              doCheck: false,
              doBanner: false,
              concatName: 'deps.js'
            }, config.buildOptions.js)))
          .pipe(gulp.dest(path.join(config.destPaths.js, 'dependencies')));

        // Build CSS
        destStreams.css = bowerStream
          .pipe(plugins.filter('**/*.css'))
          .pipe(buildCSS(_.defaults({
              doCheck: false,
              doBanner: false,
              concatName: 'deps.css'
            }, config.buildOptions.css)))
          .pipe(gulp.dest(path.join(config.destPaths.css, 'dependencies')));

        // Move SVG (assume they're already processed)
        destStreams.svg = bowerStream
          .pipe(plugins.filter('**/*.svg'))
          .pipe(gulp.dest(path.join(config.destPaths.svg, 'dependencies')));

        // Register partials (don't bother processing or moving them)
        destStreams.partials = bowerStream
          .pipe(plugins.filter('**/*.html'));

        // Move misc (assume they're already processed)
        destStreams.misc = bowerStream
          .pipe(plugins.filter([
              '*',
              '!*.js',
              '!*.css',
              '!*.svg',
              '!*.html'
            ]))
          .pipe(gulp.dest(path.join(config.destPaths.misc)));

        return merge(_.values(destStreams))
          .pipe(streamCache.put('deps'))
      });
    }
  }


  /*--- Watch Tasks ---*/
  if (!!taskOptions.watch) {

    // Main watch task:
    gulp.task('watch', function() {
      function onChange(event, component, changeOptions) {
        var tasks;

        changeOptions = _.defaults({}, changeOptions, {
          rebuildHtml: (event.type === 'added' || event.type === 'deleted')
        });

        tasks = _.compact([
          'build-' + component,
          // Re-build the HTML so file changes are properly referenced
          taskOptions.build.html && changeOptions.rebuildHtml ? 'build-html' : null,
          taskOptions.serve ? 'serve' : null
        ]);

        runSequence.apply(null, tasks);
      }

      if (taskOptions.watch.js && taskOptions.build.js) {
        gulp.watch(
          config.srcFiles.js,
          _.partialRight(onChange, 'js')
        );
      }

      if (taskOptions.watch.templates && taskOptions.build.templates) {
        gulp.watch(
          config.srcFiles.templates,
          _.partialRight(onChange, 'templates')
        );
      }

      if (taskOptions.watch.css && taskOptions.build.css) {
        gulp.watch(
          config.srcFiles.css,
          _.partialRight(onChange, 'css')
        );
      }

      if (taskOptions.watch.svg && taskOptions.build.svg) {
        gulp.watch(
          config.srcFiles.svg,
          _.partialRight(onChange, 'svg')
        );
      }

      if (taskOptions.watch.partials && taskOptions.build.partials) {
        gulp.watch(
          config.srcFiles.partials,
          _.partialRight(onChange, 'partials')
        );
      }

      if (taskOptions.watch.misc && taskOptions.build.misc) {
        gulp.watch(
          config.srcFiles.misc,
          _.partialRight(onChange, 'misc', {rebuildHtml: false})
        );
      }

      if (taskOptions.watch.html && taskOptions.build.html) {
        gulp.watch(
          config.srcFiles.html,
          _.partialRight(onChange, 'html', {rebuildHtml: false})
        );
      }

      if (taskOptions.watch.deps && taskOptions.build.deps) {
        gulp.watch(
          path.join(config.bower.components, '**', '*'),
          _.partialRight(onChange, 'deps')
        );
      }
    });
  }


  /*--- Serve Tasks ---*/
  if (!!taskOptions.serve) {

    // Main serve task:
    gulp.task('serve', function(done) {
      runSequence(
        'start-server',
        'chrome-load',
        done
      );
    });

    gulp.task('start-server', function(done) {
      var express = require('express'),
          app;

      if (!server) {
        app = express();

        app.use(express.static(config.destPaths.js));
        app.use(express.static(config.destPaths.css));
        app.use(express.static(config.destPaths.svg));
        app.use(express.static(config.destPaths.misc));

        app.get('*', function(request, response) {
          response.sendFile('index.html', {
            root: config.destPaths.html
          });
        });

        if (config.server.ssl) {
          server = require('https').createServer({
            key: fs.readFileSync(config.server.key),
            cert: fs.readFileSync(config.server.cert),
            requestCert: false,
            rejectUnauthorized: false
          }, app);
        } else {
          server = require('http').createServer(app);
        }

        server.listen(config.server.port, done);
      }
    });

    gulp.task('stop-server', function() {
      if (server) {
        server.close();
      }
    });

    gulp.task('chrome-load', function() {
      require('./chrome-load.js')(localURL);
    });
  }


  /*--- Test Tasks ---*/
  if (!!taskOptions.test) {

    // Main test task:
    gulp.task('test', function(done) {
      var testTasks = _.compact([
        taskOptions.test.unit ? 'test-unit' : null,
        taskOptions.test.integration ? 'test-integration' : null
      ]);

      runSequence(testTasks, done);
    });

    if (taskOptions.test.unit) {
      gulp.task('test-unit', function() {
        var testUnit = require('./test-unit.js'),
            bowerStream,
            appStream,
            testStream,
            matcher;

        if (!config.karma) {
          return;
        }

        bowerStream = gulp.src(mainBowerFiles({
            includeDev: true,
            paths: {
                bowerDirectory: config.bower.components,
                bowerJson: config.bower.json
              },
            filter: '**/*.js'
          }));
        appStream = gulp.src(_.flatten([config.srcFiles.js, config.srcFiles.templates]), {read: false});
        testStream = gulp.src(config.testFiles.unit, {read: false});

        if (!!args.match) {
          matcher = new RegExp(args.match.replace('/', '\\/'));

          testStream = testStream.pipe(plugins.filter(function filterFiles(file) {
            return matcher.test(file.path);
          }));
        }

        return merge(
          bowerStream,
          appStream,
          testStream
        ).pipe(testUnit(config));
      });
    }

    // We can't run integration tests without all three of these
    if (taskOptions.test.integration && !!taskOptions.build && !!taskOptions.serve) {
      gulp.task('test-integration', function(done) {
        var testIntegration = require('./test-integration.js'),
            stream,
            matcher;

        // Set global config for `env=test`
        setConfig(_.merge({env: 'test'}, args));

        // Set up stream, with filtration
        stream = gulp.src(config.testFiles.integration, {read: false});

        if (!!args.match) {
          matcher = new RegExp(args.match.replace('/', '\\/'));

          stream = stream.pipe(plugins.filter(function filterFiles(file) {
            return matcher.test(file.path);
          }));
        }

        runSequence(
          'build',
          'start-server',
          function runTests() {
              return stream.pipe(testIntegration(config));
            },
          'stop-server',
          done
        );
      });
    }
  }

  return gulp;
};
