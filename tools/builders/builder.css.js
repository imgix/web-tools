var path = require('path'),
    glob = require('glob'),
    _ = require('lodash'),
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
  var gulpPlugins = loadGulpPlugins(),
      importIDs = {};

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
            rules: require('../../runcoms/rc.stylelint.json')
          },
        'postcss-import': {
            plugins: [
                require('postcss-discard-comments')
              ],
            transform: function (fileContents) {
                // This allows us to use //-style comments in imported files, since
                // PostCSS-import doesn't allow non-css syntaxes in its parser
                return fileContents.replace(/\/\/\s(.*)\n/g, '/* $1 */\n');
              },
            resolve: function (id, baseDir, options) {
                var files,
                    pattern = id,
                    globOptions = {
                        cwd: options.path[0],
                        nosort: true
                      },
                    bowerSearch;

                if (importIDs[id]) {
                  return importIDs[id];
                }

                // Look for a bower package
                bowerSearch = /^(.+):(.+)$/.exec(id);

                if (!!bowerSearch) {
                  pattern = bowerSearch[2];
                  globOptions.cwd = path.join(options.root, 'bower_components', bowerSearch[1]);
                }

                files = glob.sync(path.join('**', pattern), globOptions);

                if (files.length) {
                  files = _.map(files, function addRoot(filepath) {
                    return path.join(globOptions.cwd, filepath);
                  });

                  importIDs[id] = files;

                  return files;
                } else {
                  return [];
                }
              }
          },
        'postcss-simple-vars': {
            silent: true
          }
      },
    minifyOptions: {
        reduceIdents: false,
        mergeIdents: false,
        discardUnused: false,
        zindex: false
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
