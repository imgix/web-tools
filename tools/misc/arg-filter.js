var _ = require('lodash'),
    args = require('yargs').argv,
    combine = require('stream-combiner'),
    filter = require('gulp-filter');

module.exports = function argFilter() {
  var regexen;

  if (!!args.match) {
    regexen = _.map(args.match.split(','), function makeRegex(match) {
      return new RegExp(match.replace('/', '\\/'), 'i');
    });

    return filter(function filterFiles(file) {
      return _.some(regexen, function testFileWithRegex(regex) {
        return regex.test(file.path);
      });
    });
  } else {
    return combine([]);
  }
};
