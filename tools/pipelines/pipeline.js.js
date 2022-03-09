var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs');

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
      // Checking pipeline
      options.doCheck && require('gulp-jshint')(_.merge(
          {lookup: false},
          require('../../runcoms/rc.jshint.json')
        )),
      options.doCheck && require('gulp-jshint').reporter(jshintReporter),
      options.doCheck && require('gulp-jscs')({
          configPath: path.join(__dirname, '..', '..', 'runcoms', 'rc.jscs.json')
        }),
      options.doCheck && require('gulp-jscs').reporter(jscsReporter.path),

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
