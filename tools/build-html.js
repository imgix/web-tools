var _ = require('lodash'),
    through = require('through2'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins'),
    htmlhintReporter = require('reporter-plus/htmlhint');

module.exports = function buildHTML(options, injectableStreams) {
  var gulpPlugins = loadGulpPlugins({
          scope: ['devDependencies']
        });

  function injectAll(injectableStreams) {
    // Create a stream through which each file will pass
    return through.obj(function transform(chunk, encoding, callback) {
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

  return combine(_.compact([
    // Checking pipeline
    options.doCheck && gulpPlugins.htmlhint({
        htmlhintrc: path.join(__dirname, '..', 'runcoms', 'rc.htmlhint.json')
      }),
    options.doCheck && gulpPlugins.htmlhint.reporter(htmlhintReporter),

    // Processing pipeline
    !!injectableStreams && injectAll(injectableStreams),
    gulpPlugins.processhtml(options.processOptions),

    // Productionization pipeline
    gulpPlugins.htmlmin(options.minifyConfig)
  ]));
};
