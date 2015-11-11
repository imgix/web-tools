var _ = require('lodash'),
    combine = require('stream-combiner'),
    htmlhintReporter = require('reporter-plus/htmlhint'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function buildTemplates(options) {
  var gulpPlugins = loadGulpPlugins({
    scope: ['devDependencies'],
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

  return combine(_.compact([
    // Checking pipeline
    options.doCheck && gulpPlugins.htmlhint({
        htmlhintrc: path.join(__dirname, '..', 'runcoms', 'rc.htmlhint.json')
      }),
    options.doCheck && gulpPlugins.htmlhint.reporter(htmlhintReporter),

    // Processing pipeline
    options.doMinify && gulpPlugins.htmlmin(options.htmlMinifyConfig),
    gulpPlugins.ngHtml2Js(options.ngHtml2JsConfig),
    gulpPlugins.rename(options.renameConfig),

    // Productionization pipeline
    options.doMinify && gulpPlugins.uglify(),
    options.doConcat && gulpPlugins.concat(options.concatName),
    options.doBanner && gulpPlugins.header(options.banner),
    options.doVersioning && gulpPlugins.rev(),
    options.doMinify && gulpPlugins.rename(options.minifyRenameConfig),
  ]));
};
