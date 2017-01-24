var _ = require('lodash'),
    args = require('yargs').argv,
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function argFilter() {
  var gulpPlugins = loadGulpPlugins(),
      regexen,
      pipeline = [];

  if (!!args.match) {
    regexen = _.map(args.match.split(','), function makeRegex(match) {
      return new RegExp(match.replace('/', '\\/'), 'i');
    });

    pipeline.push(gulpPlugins.filter(function filterFiles(file) {
      return _.some(regexen, function testFileWithRegex(regex) {
        return regex.test(file.path);
      });
    }));
  }

  return combine(_.compact(pipeline));
};
