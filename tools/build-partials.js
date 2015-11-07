var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    htmlhint = require('gulp-htmlhint'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    htmlmin = require('gulp-htmlmin');

module.exports = function buildPartials(options, injectableStreams) {
  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doMinify: false,

    processConfig: {
        commentMarker: 'process',
        strip: true
      },
    minifyConfig: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true
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
      .pipe(
          processhtml(options.processOptions)
        )

      // Productionization pipeline
      .pipe(
          htmlmin(options.minifyConfig)
        );

    done();
  });
};
