var _ = require('lodash'),
    combine = require('stream-combiner');

module.exports = function setupSVGPipeline(gulp) {
  return function svgPipeline(options) {
    options = _.defaults({}, options, {
      doProcessing: true,
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
      options.doProcessing && require('gulp-svgstore')(options.svgStoreOptions),
      options.doProcessing && require('gulp-rename')(options.concatName),

      // Productionization pipeline
      options.doMinify && require('gulp-svgmin')(options.svgMinOptions),
      options.doMinify && require('gulp-rename')(options.minifyRenameOptions)
    ]));
  };
};
