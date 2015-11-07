var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    sourcemaps = require('gulp-sourcemaps'),
    postcss = require('gulp-postcss'),
    cssnano = require('gulp-cssnano'),
    concat = require('gulp-concat'),
    header = require('gulp-header'),
    rev = require('gulp-rev'),
    rename = require('gulp-rename'),
    CHECK_PLUGINS,
    PROCESS_PLUGINS;

function getPostCSSPlugins(pluginList, pluginConfigs) {
  return _.map(pluginList, function requirePluginWithConfig(plugin) {
    var config = _.get(pluginOptions, plugin);
    return require(plugin)(config);
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
  'postcss-fakeid',

  // Browser compat
  'autoprefixer',
  'postcss-pseudoelements',
  'postcss-color-rgba-fallback'
];

module.exports = function buildCSS(options) {
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

    postCSSConfig: {
        parser: require('postcss-scss')
      },
    pluginConfigs: {
        stylelint: {
            rules: require('./runcoms/rc.stylelint.json'),
            plugins: {
                'statement-max-nesting-depth': require('stylelint-statement-max-nesting-depth'),
              }
          }
      },
    minifyRenameConfig: {
        extname: '.min.css'
      }
  });

  return through.obj(null, function flush(done) {
    this
      // Checking pipeline
      .pipe(gulpIf(options.doCheck,
          postcss(
              getPostCSSPlugins(CHECK_PLUGINS, options.pluginConfigs),
              options.postCSSConfig
            )
        ))

      // Processing pipeline
      .pipe(gulpIf(options.doSourceMaps,
          sourcemaps.init()
        ))
      .pipe(gulpIf(options.doProcessing,
          postcss(
              getPostCSSPlugins(PROCESS_PLUGINS, options.pluginConfigs),
              options.postCSSConfig
            )
        ))

      // Productionization pipeline
      .pipe(gulpIf(options.doMinify,
          cssnano()
        ))
      .pipe(gulpIf(options.doConcat,
          concat(options.concatName)
        ))
      .pipe(gulpIf(options.doBanner,
          header(options.banner)
        ))
      .pipe(gulpIf(options.doVersioning,
          rev()
        ))
      .pipe(gulpIf(options.doMinify,
          rename(options.minifyRenameConfig)
        ))
      .pipe(gulpIf(options.doSourceMaps,
          sourcemaps.write(options.mapsDir)
        ));

    done();
  });
};
