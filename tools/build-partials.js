var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins'),
    htmlhintReporter = require('reporter-plus/htmlhint');

module.exports = function buildPartials(options) {
  var gulpPlugins = loadGulpPlugins({
          scope: ['devDependencies']
        });

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

  return combine(_.compact([
    // Checking pipeline
    options.doCheck && gulpPlugins.htmlhint({
        htmlhintrc: path.join(__dirname, '..', 'runcoms', 'rc.htmlhint.json')
      }),
    options.doCheck && gulpPlugins.htmlhint.reporter(htmlhintReporter),

    // Processing pipeline
    gulpPlugins.processhtml(options.processOptions),

    // Productionization pipeline
    gulpPlugins.htmlmin(options.minifyConfig)
  ]));
};
