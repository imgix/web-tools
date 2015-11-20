var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function buildTemplates(options) {
  var gulpPlugins = loadGulpPlugins({
    rename: {
        'gulp-ng-html2js': 'ngHtml2Js'
      }
  });

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

    htmlMinifyOptions: {
        removeComments: true,
        collapseWhitespace: true,
        conservativeCollapse: true,
        collapseBooleanAttributes: true,
        removeRedundantAttributes: true
      },
    ngHtml2JsOptions: {
        declareModule: false,
        moduleName: 'override.me',
        rename: function (templateURL) {
            return path.parse(templateURL).base;
          }
      },
    renameOptions: {
        extname: '.tmpl.js'
      },
    minifyRenameOptions: {
        extname: '.min.js'
      }
  });

  return combine(_.compact([
    // Checking pipeline
    options.doCheck && gulpPlugins.htmlhint({
        htmlhintrc: path.join(__dirname, '..', 'runcoms', 'rc.htmlhint.json')
      }),
    options.doCheck && gulpPlugins.htmlhint.reporter(htmlhintReporter),

    // Processing pipeline
    options.doMinify && gulpPlugins.htmlmin(options.htmlMinifyOptions),
    gulpPlugins.ngHtml2Js(options.ngHtml2JsOptions),
    gulpPlugins.rename(options.renameOptions),

    // Productionization pipeline
    options.doMinify && gulpPlugins.uglify(),
    options.doConcat && gulpPlugins.concat(options.concatName),
    options.doBanner && gulpPlugins.header(options.banner),
    options.doVersioning && gulpPlugins.rev(),
    options.doMinify && gulpPlugins.rename(options.minifyRenameOptions)
  ]));
};
