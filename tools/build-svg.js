var _ = require('lodash'),
    through = require('through2'),
    gulpIf = require('gulp-if'),
    svgstore = require('gulp-svgstore'),
    svgmin = require('gulp-svgmin'),
    rename = require('gulp-rename');

module.exports = function buildSVG(options) {
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

  return through.obj(null, function flush(done) {
    this
      // Processing pipeline
      .pipe(
          svgstore(options.svgStoreConfig)
        )
      .pipe(
          rename(options.concatName)
        )

      // Productionization pipeline
      .pipe(gulpIf(options.doMinify,
          svgmin(options.svgMinConfig)
        ))
      .pipe(gulpIf(options.doMinify,
          rename(options.minifyRenameConfig)
        ));

    done();
  });
};
