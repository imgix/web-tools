var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    merge = require('merge2'),
    args = require('yargs').argv,
    clean = require('gulp-clean'),
    filter = require('gulp-filter'),
    runSequence = require('run-sequence'),
    mainBowerFiles = require('main-bower-files'),
    getBowerFiles = require('./tools/get-bower-files.js'),
    buildCSS = require('./tools/build-css.js'),
    buildHTML = require('./tools/build-html.js'),
    buildJS = require('./tools/build-js.js'),
    buildSVG = require('./tools/build-svg.js'),
    buildTemplates = require('./tools/build-templates.js'),
    testIntegration = require('./tools/test-integration.js'),
    testUnit = require('./tools/test-unit.js'),
    streamCache = require('./tools/stream-cache.js'),
    chromeLoad = require('./tools/chrome-load.js');

module.exports = function(gulp, configFile, options) {
  var config,
      localURL,
      server;

  function setConfig(withArgs) {
    config = require(configFile)(withArgs);
  }

  // Set global config at outset
  setConfig(args);

  options = _.defaultsDeep({}, options, {
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
      !!options.build ? 'build' : undefined,
      !!options.serve ? 'serve' : undefined,
      !!options.watch ? 'watch' : undefined,
      done
    ]);

    runSequence.apply(null, tasks);
  });


  /*--- Build Tasks ---*/
  if (!!options.build) {

    // Main build task:
    gulp.task('build', function(done) {
      var buildTasks = _.compact([
        options.build.js ? 'build-js' : null,
        options.build.templates ? 'build-templates' : null,
        options.build.css ? 'build-css' : null,
        options.build.svg ? 'build-svg' : null,
        options.build.partials ? 'build-partials' : null,
        options.build.misc ? 'build-misc' : null,
        options.build.html ? 'build-html' : null,
        options.build.deps ? 'build-deps' : null,
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
        .pipe(clean());
    });

    if(options.build.js) {
      gulp.task('build-js', function() {
        return gulp.src(config.srcFiles.js)
          .pipe(buildJS(config.buildOptions.js))
          .pipe(gulp.dest(config.destPaths.js))
          .pipe(streamCache.put('js'));
      });
    }

    if(options.build.templates) {
      gulp.task('build-templates', function() {
        return gulp.src(config.srcFiles.templates)
          .pipe(buildTemplates(config.buildOptions.templates))
          .pipe(gulp.dest(config.destPaths.templates))
          .pipe(streamCache.put('templates'));
      });
    }

    if(options.build.css) {
      gulp.task('build-css', function() {
        return gulp.src(config.srcFiles.css)
          .pipe(buildCSS(config.buildOptions.css))
          .pipe(gulp.dest(config.destPaths.css))
          .pipe(streamCache.put('css'));
      });
    }

    if(options.build.svg) {
      gulp.task('build-svg', function() {
        return gulp.src(config.srcFiles.svg)
          .pipe(buildSVG(config.buildOptions.svg))
          .pipe(gulp.dest(config.destPaths.svg))
          .pipe(streamCache.put('svg'));
      });
    }

    if(options.build.partials) {
      gulp.task('build-partials', function() {
        return gulp.src(config.srcFiles.partials)
          .pipe(buildPartials(config.buildOptions.partials))
          .pipe(gulp.dest(config.destPaths.partials))
          .pipe(streamCache.put('partials'));
      });
    }

    if(options.build.misc) {
      gulp.task('build-misc', function() {
        return gulp.src(config.srcFiles.misc)
          .pipe(gulp.dest(config.destPaths.misc))
          .pipe(streamCache.put('misc'));
      });
    }

    if(options.build.html) {
      gulp.task('build-html',
        _.compact([ // List of tasks that must execute first
            options.build.js ? 'build-js' : null,
            options.build.templates ? 'build-templates' : null,
            options.build.css ? 'build-css' : null,
            options.build.svg ? 'build-svg' : null,
            options.build.partials ? 'build-partials' : null,
            options.build.deps ? 'build-deps' : null,
          ]),
        function() {
          var assetStreams = {};

          // Combine app assets into a single injectable stream
          assetStreams.app = merge(_.compact([
            streamCache.get('js'),
            streamCache.get('templates'),
            streamCache.get('css'),
            streamCache.get('svg'),
            streamCache.get('partials')
          ]));

          if (options.build.deps) {
            assetStreams.deps = streamCache.get('deps');
          }

          return gulp.src(config.srcFiles.svg)
            // Pipe to destination before processing so the injected assets will have the correct relative URLs
            .pipe(gulp.dest(config.destPaths.html))
            .pipe(buildHTML(config.buildOptions.html, assetStreams)
            .pipe(gulp.dest(config.destPaths.html))
            .pipe(streamCache.put('html'));
        }
      );
    }

    if (options.build.deps) {
      gulp.task('build-deps', function() {
        var srcStream = getBowerFiles({
                mainBowerFilesConfig: {
                    paths: {
                        bowerJson: config.bower.json,
                        bowerDirectory: config.bower.components
                      }
                  }
              }),
            destStreams = {};

        // Build JS
        destStreams.js = bowerStream
          .pipe(filter('**/*.js'))
          .pipe(buildJS(_.default({
              doCheck: false,
              doBanner: false,
              concatName: 'deps.js'
            }, config.buildOptions.js)))
          .pipe(gulp.dest(path.join(config.destPaths.js, 'dependencies')));

        // Build CSS
        destStreams.css = bowerStream
          .pipe(filter('**/*.css'))
          .pipe(buildCSS(_.default({
              doCheck: false,
              doBanner: false,
              concatName: 'deps.css'
            }, config.buildOptions.css)))
          .pipe(gulp.dest(path.join(config.destPaths.css, 'dependencies')));

        // Move SVG (assume they're already processed)
        destStreams.svg = bowerStream
          .pipe(filter('**/*.svg'))
          .pipe(gulp.dest(path.join(config.destPaths.svg, 'dependencies')));

        // Register partials (don't bother processing or moving them)
        destStreams.partials = bowerStream
          .pipe(filter('**/*.html'));

        // Move misc (assume they're already processed)
        destStreams.misc = bowerStream
          .pipe(filter([
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
  if (!!options.watch) {

    // Main watch task:
    gulp.task('watch', function() {
      function onChange(event, component, options) {
        var tasks;

        options = _.defaults({}, options, {
          rebuildHtml: (event.type === 'added' || event.type === 'deleted')
        });

        tasks = _.compact([
          'build-' + component,
          // Re-build the HTML so file changes are properly referenced
          options.build.html && options.rebuildHtml ? 'build-html' : null,
          options.serve ? 'serve' : null
        ]);

        runSequence.apply(null, tasks);
      }

      if (options.watch.js && options.build.js) {
        gulp.watch(
          config.srcFiles.js,
          _.partialRight(onChange, 'js')
        );
      }

      if (options.watch.templates && options.build.templates) {
        gulp.watch(
          config.srcFiles.templates,
          _.partialRight(onChange, 'templates')
        );
      }

      if (options.watch.css && options.build.css) {
        gulp.watch(
          config.srcFiles.css,
          _.partialRight(onChange, 'css')
        );
      }

      if (options.watch.svg && options.build.svg) {
        gulp.watch(
          config.srcFiles.svg,
          _.partialRight(onChange, 'svg')
        );
      }

      if (options.watch.partials && options.build.partials) {
        gulp.watch(
          config.srcFiles.partials,
          _.partialRight(onChange, 'partials')
        );
      }

      if (options.watch.misc && options.build.misc) {
        gulp.watch(
          config.srcFiles.misc,
          _.partialRight(onChange, 'misc', {rebuildHtml: false})
        );
      }

      if (options.watch.html && options.build.html) {
        gulp.watch(
          config.srcFiles.html,
          _.partialRight(onChange, 'html', {rebuildHtml: false})
        );
      }

      if (options.watch.deps && options.build.deps) {
        gulp.watch(
          path.join(config.bower.components, '**', '*'),
          _.partialRight(onChange, 'deps')
        );
      }
    });
  }


  /*--- Serve Tasks ---*/
  if (!!options.serve) {

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
      chromeLoad(localURL);
    });
  }


  /*--- Test Tasks ---*/
  if (!!options.test) {

    // Main test task:
    gulp.task('test', function(done) {
      var testTasks = _.compact([
        options.test.unit ? 'test-unit' : null,
        options.test.integration ? 'test-integration' : null
      ]);

      runSequence(testTasks, done);
    });

    if (options.test.unit) {
      gulp.task('test-unit', function() {
        var bowerFiles,
            appFiles,
            testFiles,
            matcher;

        if (!config.karma) {
          return;
        }

        bowerFiles = mainBowerFiles({
            includeDev: true,
            paths: {
                bowerDirectory: config.bower.components,
                bowerJson: config.bower.json
              },
            filter: '**/*.js'
          });
        appFiles = gulp.src([config.srcFiles.js, config.srcFiles.templates], {read: false});
        testFiles = gulp.src(config.testFiles.unit, {read: false});

        if (!!args.match) {
          matcher = new RegExp(args.match.replace('/', '\\/'));

          testFiles = testFiles.pipe(filter(function filterFiles(file) {
            return matcher.test(file.path);
          }));
        }

        return merge([
          bowerFiles,
          appFiles,
          testFiles
        ]).pipe(testUnit(config));
      });
    }

    // We can't run integration tests without all three of these
    if (options.test.integration && !!options.build && !!options.serve) {
      gulp.task('test-integration', function(done) {
        var stream,
            matcher;

        // Set global config for `env=test`
        setConfig(_.merge({env: 'test'}, args));

        // Set up stream, with filtration
        stream = gulp.src(config.testFiles.integration, {read: false});

        if (!!args.match) {
          matcher = new RegExp(args.match.replace('/', '\\/'));

          stream = stream.pipe(filter(function filterFiles(file) {
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
