var _ = require('lodash'),
    babelify = require('babelify'),
    combine = require('stream-combiner'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs'),
    path = require('path'),
    sort = require('gulp-sort');

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

      entryFile: 'application.js',
      concatName: 'override_me.js',
      banner: '/* Built: ' + Date.now() + ' */\n',
      mapsDir: '.maps',

      uglifyOptions: {},
      minifyRenameOptions: {
          extname: '.min.js'
        }
    });

    const BABELIFY_CONFIG = {
      presets: _.compact([
        options.doBabel && require('@babel/preset-env')
      ])
    };

    return combine(_.compact([
      sort({
        comparator: (file1) => {
          return file1.path.includes(options.entryFile) ? -1 : 1;
        }
      }),
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

      // Browserify
      require('gulp-bro')(
        {
          transform: [
            babelify.configure(BABELIFY_CONFIG)
          ]
        }
      ),

      // Productionization pipeline
      options.doSourceMaps && require('gulp-sourcemaps').init(),
      options.doMinify && require('gulp-uglify')(options.uglifyOptions),
      options.doConcat && require('gulp-concat')(options.concatName),
      options.doBanner && require('gulp-header')(options.banner),
      options.doVersioning && require('gulp-rev')(),
      options.doMinify && require('gulp-rename')(options.minifyRenameOptions),
      options.doSourceMaps && require('gulp-sourcemaps').write(options.mapsDir)
    ]));
  };
};
