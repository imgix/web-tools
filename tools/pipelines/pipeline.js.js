var _ = require('lodash'),
    path = require('path'),
    eslint=require('gulp-eslint'),
    combine = require('stream-combiner');

module.exports = function setupJSPipeline(gulp) {
  return function jsPipeline(options) {
    options = _.defaultsDeep({}, options, {
      doCheck: true,
      doMinify: false,
      doConcat: false,
      doBanner: false,
      doVersioning: false,
      doSourceMaps: false,
      doBabel: true,

      concatName: 'override_me.js',
      banner: '/* Built: ' + Date.now() + ' */\n',
      mapsDir: '.maps',

      uglifyOptions: {},
      minifyRenameOptions: {
          extname: '.min.js'
        }
    });

    return combine(_.compact([
      // Linting pipeline
      options.doCheck && eslint({configFile: path.join(__dirname, '..', '..', 'runcoms', '.eslintrc')}),
      options.doCheck && eslint.results(results => {
        // Called once for all ESLint results.
        results.warningCount && console.warn('\x1b[33m%s\x1b[0m',`ESLint - Total Warnings: ${results.warningCount}`);
        results.errorCount && console.error('\x1b[36m%s\x1b[0m',`ESLint - Total Errors: ${results.errorCount}`);
      }),
      options.doCheck && eslint.format(),
      // Productionization pipeline
      options.doSourceMaps && require('gulp-sourcemaps').init(),
      options.doBabel && require('gulp-babel')({
          presets: [require('@babel/preset-env')]
        }),
      options.doMinify && require('gulp-uglify-es').default(options.uglifyOptions),
      options.doConcat && require('gulp-concat')(options.concatName),
      options.doBanner && require('gulp-header')(options.banner),
      options.doVersioning && require('gulp-rev')(),
      options.doMinify && require('gulp-rename')(options.minifyRenameOptions),
      options.doSourceMaps && require('gulp-sourcemaps').write(options.mapsDir)
    ]));
  };
};
