var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    cheerio = require('cheerio');

module.exports = function buildHTML(options, injectableStreams) {
  var gulpPlugins = loadGulpPlugins();

  function injectAll(injectableStreams) {
    return combine(_(injectableStreams).map(function streamLoop(stream, name) {
      if (stream) {
        return gulpPlugins.inject(stream, _.merge(
          {name: name},
          options.injectOptions
        ));
      }
    }).compact().value());
  }

  function transformForInjection(filePath, file) {
    var ext = path.extname(filePath),
        $;

    // For SVG files, return the whole file minus xml and doctype declarations
    if (ext === '.svg') {
      $ = cheerio.load(file.contents.toString());
      $('svg').addClass('refs');
      return $.xml();

    // For HTML partials, return the whole darn thing
    } else if (ext === '.html') {
      return file.contents.toString();

    // Use the default transform as fallback
    } else {
      return gulpPlugins.inject.transform.apply(gulpPlugins.inject.transform, arguments);
    }
  }

  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doProcess: true,
    doInject: false,
    doMinify: false,

    processOptions: {
        commentMarker: 'process',
        strip: true
      },
    injectOptions: {
        relative: false,
        quiet: true,
        removeTags: true,
        starttag: '<!-- inject:{{name}} -->',
        empty: true,
        transform: transformForInjection
      },
    minifyOptions: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        collapseBooleanAttributes: true
      }
  });

  return combine(_.compact([
    // Checking pipeline
    options.doCheck && gulpPlugins.htmlhint({
        htmlhintrc: path.join('node_modules', 'web-tools', 'runcoms', 'rc.htmlhint.json')
      }),
    options.doCheck && gulpPlugins.htmlhint.reporter(htmlhintReporter),

    // Processing pipeline
    options.doProcess && gulpPlugins.processhtml(options.processOptions),
    options.doInject && !!injectableStreams && injectAll(injectableStreams),

    // Productionization pipeline
    options.doMinify && gulpPlugins.htmlmin(options.minifyOptions)
  ]));
};
