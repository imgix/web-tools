var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    sourcemaps = require('gulp-sourcemaps'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    header = require('gulp-header'),
    rev = require('gulp-rev'),
    rename = require('gulp-rename');

module.exports = function buildJS(options) {
  options = _.defaults({}, options, {
    doCheck: true,
    doMinify: false,
    doConcat: false,
    doBanner: false,
    doVersioning: false,
    doSourceMaps: false,

    concatName: 'override_me.js',
    banner: '/* Built: ' + Date.now() + ' */\n',
    mapsDir: '.maps',

    minifyRenameConfig: {
        extname: '.min.js'
      }
  });

  return through.obj(null, function flush(done) {
    this
      // Checking pipeline
      .pipe(gulpIf(options.doCheck,
          jshint(_.merge(
              {lookup: false},
              require('./runcoms/rc.jshint.json')
            ))
        ))
      .pipe(gulpIf(options.doCheck,
          jshint.reporter(jshintReporter)
        ))
      .pipe(gulpIf(options.doCheck,
          jscs({configPath: './runcoms/rc.jscs.json'})
        ))
      .pipe(gulpIf(options.doCheck,
          jscs.reporter(jscsReporter.path)
        ))

      // Productionization pipeline
      .pipe(gulpIf(options.doSourceMaps,
          sourcemaps.init()
        ))
      .pipe(gulpIf(options.doMinify,
          uglify()
        ))
      .pipe(gulpIf(options.doConcat,
          concat(options.concatName)
        ))
      .pipe(gulpIf(options.doBanner,
          header(options.banner)
        ))
      .pipe(gulpIf(options.doVersioning,
          rev()
        ))
      .pipe(gulpIf(options.doMinify,
          rename(options.minifyRenameConfig)
        ))
      .pipe(gulpIf(options.doSourceMaps,
          sourcemaps.write(options.mapsDir)
        ));

    done();
  });
};
