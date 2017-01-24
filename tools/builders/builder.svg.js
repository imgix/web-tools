var _ = require('lodash'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function buildSVG(options) {
  var gulpPlugins = loadGulpPlugins();

  options = _.defaults({}, options, {
    doMinify: false,

    concatName: 'override_me.svg',

    svgStoreOptions: {},
    svgMinOptions: {
        plugins: [
            {
                cleanupIDs: false
              },
            {
                removeUnknownsAndDefaults: {
                    defaultAttrs: false
                  }
              }
          ]
      },
    minifyRenameOptions: {
        extname: '.min.svg'
      }
  });

  return combine(_.compact([
    // Processing pipeline
    gulpPlugins.svgstore(options.svgStoreOptions),
    gulpPlugins.rename(options.concatName),

    // Productionization pipeline
    options.doMinify && gulpPlugins.svgmin(options.svgMinOptions),
    options.doMinify && gulpPlugins.rename(options.minifyRenameOptions)
  ]));
};
