var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    cheerio = require('cheerio'),
    args = require('yargs').argv;

module.exports = function setupHTMLPipeline(gulp) {
  var inject = require('gulp-inject');

  function injectAll(options, injectableStreams) {
    return combine(_(injectableStreams).map(function streamLoop(stream, name) {
      if (stream) {
        return inject(stream, _.merge(
          {name: name},
          options
        ));
      }
    }).compact().value());
  }

  function transformForInjection(filePath, file) {
    var ext = path.extname(filePath),
        $;

    // For SVG files, return the whole file minus xml and doctype declarations
    if (ext === '.svg') {
      $ = cheerio.load(file.contents.toString(), {
        xmlMode: true
      });

      $('svg').addClass('refs');
      return $.xml();

    // For HTML partials, return the whole darn thing
    } else if (ext === '.html') {
      return file.contents.toString();

    } else if (ext === '.js') {
      if (args.env === 'production') {
        return `<script src="${ filePath }" async defer></script>`;
      } else {
        return `<script src="${ filePath }"></script>`;
      }
    // Use the default transform as fallback
    } else if (ext !== '.map') {
      return inject.transform.apply(inject.transform, arguments);
    }
  }

  return function htmlPipeline(options, injectableStreams) {
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
      options.doCheck && require('gulp-htmlhint')({
          htmlhintrc: path.join('node_modules', 'web-tools', 'runcoms', 'rc.htmlhint.json')
        }),
      options.doCheck && require('gulp-htmlhint').reporter(htmlhintReporter),

      // Processing pipeline
      options.doProcess && require('gulp-processhtml')(options.processOptions),
      options.doInject && !!injectableStreams && injectAll(options.injectOptions, injectableStreams),

      // Productionization pipeline
      options.doMinify && require('gulp-htmlmin')(options.minifyOptions)
    ]));
  };
};
