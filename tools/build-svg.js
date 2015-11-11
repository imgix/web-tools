var _ = require('lodash'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function buildSVG(options) {
  var gulpPlugins = loadGulpPlugins({
          scope: ['devDependencies']
        });

  options = _.defaults({}, options, {
    doMinify: false,

    concatName: 'override_me.svg',

    svgStoreConfig: {
        svg: {xmlns: 'http://www.w3.org/2000/svg'}
      },
    svgMinConfig: {
        plugins: [
            {cleanupIDs: false}
          ]
      },
    minifyRenameConfig: {
        extname: '.min.svg'
      }
  });

  return combine(_.compact([
    // Processing pipeline
    gulpPlugins.svgstore(options.svgStoreConfig),
    gulpPlugins.rename(options.concatName),

    // Productionization pipeline
    options.doMinify && gulpPlugins.svgmin(options.svgMinConfig),
    options.doMinify && gulpPlugins.rename(options.minifyRenameConfig)
  ]));
};
