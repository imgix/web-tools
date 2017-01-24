var _ = require('lodash'),
    path = require('path'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs');

module.exports = function buildJS(options) {
  var gulpPlugins = loadGulpPlugins();

  options = _.defaultsDeep({}, options, {
    doCheck: true,
    doMinify: false,
    doConcat: false,
    doBanner: false,
    doVersioning: false,
    doSourceMaps: false,

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
    options.doCheck && gulpPlugins.jshint(_.merge(
        {lookup: false},
        require('../runcoms/rc.jshint.json')
      )),
    options.doCheck && gulpPlugins.jshint.reporter(jshintReporter),
    options.doCheck && gulpPlugins.jscs({
        configPath: path.join(__dirname, '..', 'runcoms', 'rc.jscs.json')
      }),
    options.doCheck && gulpPlugins.jscs.reporter(jscsReporter.path),

    // Productionization pipeline
    options.doSourceMaps && gulpPlugins.sourcemaps.init(),
    options.doMinify && gulpPlugins.uglify(options.uglifyOptions),
    options.doConcat && gulpPlugins.concat(options.concatName),
    options.doBanner && gulpPlugins.header(options.banner),
    options.doVersioning && gulpPlugins.rev(),
    options.doMinify && gulpPlugins.rename(options.minifyRenameOptions),
    options.doSourceMaps && gulpPlugins.sourcemaps.write(options.mapsDir)
  ]));
};
