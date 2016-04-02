var _ = require('lodash'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins'),
    CHECK_PLUGINS,
    PROCESS_PLUGINS;

function getPostCSSPlugins(pluginList, pluginOptions) {
  return _.map(pluginList, function requirePluginWithOptions(plugin) {
    var options = _.get(pluginOptions, plugin);
    return require(plugin)(options);
  });
}

CHECK_PLUGINS = [
  'stylelint',
  'reporter-plus/postcss'
];

PROCESS_PLUGINS = [
  // Sass-style convenience
  'postcss-import',
  'postcss-mixins',
  'postcss-nested',
  'postcss-simple-vars',

  // Reduce calcs, when possible
  'postcss-calc',

  // Grid system
  'lost',

  // Sane loops
  'postcss-each',
  'postcss-for',

  // Additional functions
  'postcss-color-function',

  // New selectors
  'postcss-selector-matches',
  'postcss-selector-not',

  // Some niceties
  'postcss-easings',
  'postcss-clearfix',

  // Browser compat
  'autoprefixer',
  'postcss-pseudoelements',
  'postcss-color-rgba-fallback'
];

module.exports = function buildCSS(options) {
  var gulpPlugins = loadGulpPlugins();

  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doProcessing: true,
    doMinify: false,
    doConcat: false,
    doBanner: false,
    doVersioning: false,
    doSourceMaps: true,

    concatName: 'override_me.css',
    banner: '/* Built: ' + Date.now() + ' */\n',
    mapsDir: '.maps',

    postCSSOptions: {
        parser: require('postcss-scss')
      },
    pluginOptions: {
        stylelint: {
            rules: require('../runcoms/rc.stylelint.json')
          },
        'postcss-import': {
            plugins: [
                require('postcss-discard-comments')
              ],
            transform: function (fileContents) {
                // This allows us to use //-style comments in imported files, since
                // PostCSS-import doesn't allow non-css syntaxes in its parser
                return fileContents.replace(/\/\/\s(.*)\n/g, '/* $1 */\n');
              }
          },
        'postcss-simple-vars': {
            silent: true
          }
      },
    minifyOptions: {
        reduceIdents: false,
        mergeIdents: false,
        discardUnused: false
      },
    minifyRenameOptions: {
        extname: '.min.css'
      }
  });

  return combine(_.compact([
      // Checking pipeline
      options.doCheck && gulpPlugins.postcss(
          getPostCSSPlugins(CHECK_PLUGINS, options.pluginOptions),
          options.postCSSOptions
        ),

      // Processing pipeline
      options.doSourceMaps && gulpPlugins.sourcemaps.init(),
      options.doProcessing && gulpPlugins.postcss(
          getPostCSSPlugins(PROCESS_PLUGINS, options.pluginOptions),
          options.postCSSOptions
        ),

      // Productionization pipeline
      options.doMinify && gulpPlugins.cssnano(options.minifyOptions),
      options.doConcat && gulpPlugins.concat(options.concatName),
      options.doBanner && gulpPlugins.header(options.banner),
      options.doVersioning && gulpPlugins.rev(),
      options.doMinify && gulpPlugins.rename(options.minifyRenameOptions),
      options.doSourceMaps && gulpPlugins.sourcemaps.write(options.mapsDir)
  ]));
};
