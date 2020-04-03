var _ = require('lodash');

module.exports = {
  applyTo: function (gulp) {
      var extOptions;

      if (!gulp.getExt) {
        extOptions = _.get(gulp, 'webToolsConfig.extOptions');

        gulp.getExt = function getExtFiles(options) {
          if (_.isFunction(extOptions.getter)) {
            return extOptions.getter(options);

          } else if (extOptions.getter === 'npm') {
            return require('main-npm-files')('**/*.*', _.defaultsDeep({
              pkgJson: _.get(extOptions, 'json', 'package.json'),
              nodeModules: _.get(extOptions, 'modules', 'node_modules'),
              onlyMain: false
            }, options));

          } else {
            return require('main-bower-files')(_.defaultsDeep({
              paths: {
                  bowerJson: _.get(extOptions, 'json', 'bower.json'),
                  bowerDirectory: _.get(extOptions, 'modules', 'bower_components')
                }
            }, options));
          }
        }
      }

      return gulp;
    }
};
