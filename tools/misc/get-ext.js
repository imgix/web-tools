var _ = require('lodash');

module.exports = function getExtFiles(extOptions) {
  if (_.isFunction(extOptions.getter)) {
    return extOptions.getter();
  } else if (extOptions.getter === 'npm') {
    return require('main-npm-files')('**/*.*', {
      pkgJson: _.get(extOptions, 'json', 'package.json'),
      nodeModules: _.get(extOptions, 'modules', 'node_modules'),
      onlyMain: true
    });
  } else {
    return require('main-bower-files')({
      paths: {
          bowerJson: _.get(extOptions, 'json', 'bower.json'),
          bowerDirectory: _.get(extOptions, 'modules', 'bower_components')
        }
    });
  }
};
