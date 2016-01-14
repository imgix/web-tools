var _ = require('lodash'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function argFilter(args) {
  var gulpPlugins = loadGulpPlugins(),
      regexen,
      pipeline = [];

  if (!!args.match) {
    regexen = _.map(args.match.split(','), function makeRegex(match) {
      return new RegExp(match.replace('/', '\\/'), 'i');
    });

    pipeline.push(gulpPlugins.filter(function filterFiles(file) {
      return _.any(regexen, function testFileWithRegex(regex) {
        return regex.test(file.path);
      });
    }));
  }

  return combine(_.compact(pipeline));
};
