var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    sourcemaps = require('gulp-sourcemaps'),
    htmlhint = require('gulp-htmlhint'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    htmlmin = require('gulp-htmlmin'),
    ngHtml2Js = require('gulp-ng-html2js'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    header = require('gulp-header'),
    rev = require('gulp-rev'),
    rename = require('gulp-rename');

module.exports = function buildTemplates(options) {
  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doMinify: false,
    doConcat: false,
    doBanner: false,
    doVersioning: false,
    doSourceMaps: false,

    moduleName: 'override-me',
    concatName: 'override_me.tmpl.js',
    banner: '/* Built: ' + Date.now() + ' */\n',

    htmlMinifyConfig: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true
      },
    ngHtml2JsConfig: {
        declareModule: false,
        moduleName: 'override.me',
        rename: function(templateURL) {
            return path.parse(templateURL).base;
          }
      },
    renameConfig: {
        extname: '.tmpl.js'
      },
    minifyRenameConfig: {
        extname: '.min.js'
      }
  });

  return through.obj(null, function flush(done) {
    this
        // Checking pipeline
        .pipe(gulpIf(options.doCheck,
            htmlhint('./runcoms/rc.htmlhint.json')
          ))
        .pipe(gulpIf(options.doCheck,
            htmlhint.reporter(htmlhintReporter)
          ))

        // Processing pipeline
        .pipe(gulpIf(options.doMinify,
            htmlmin(options.htmlMinifyConfig)
          ))
        .pipe(
            ngHtml2Js(options.ngHtml2JsConfig)
          )
        .pipe(
            rename(options.renameConfig)
          )

        // Productionization pipeline
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
          ));

    done();
  });
};
