var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    htmlhint = require('gulp-htmlhint'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    htmlmin = require('gulp-htmlmin');

module.exports = function buildHTML(options, injectableStreams) {
  function injectAll(injectableStreams) {
    // Create a stream through which each file will pass
    return through2obj(function transform(chunk, encoding, callback) {
      var injectionStream = _.reduce(injectableStreams, function(uberStream, injectableStream, injectionName) {
        return uberStream.pipe(
            inject(injectableStream, _.merge({
              name: 'inject:' + name
            }, options.injectConfig))
          );
      }, through2());

      // Catch errors from the streamer and emit a gulp plugin error
      injectionStream.on('error', this.emit.bind(this, 'error'));

      // Transform the stream
      chunk.contents = chunk.contents.pipe(injectionStream);

      this.push(chunk);
      callback();
    });
  }

  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doMinify: false,
    doInject: true,

    injectConfig: {
        relative: false,
        quiet: true
      },
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
      .pipe(gulpIf(!!injectableStreams,
          injectAll(injectableStreams)
        ))
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
