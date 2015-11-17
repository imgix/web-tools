var _ = require('lodash'),
    combine = require('stream-combiner'),
    loadGulpPlugins = require('gulp-load-plugins');

module.exports = function argFilter(args) {
  var gulpPlugins = loadGulpPlugins(),
      matcher,
      pipeline = [];

  if (!!args.match) {
    matcher = new RegExp(args.match.replace('/', '\\/'), 'i');

    pipeline.push(gulpPlugins.filter(function filterFiles(file) {
      return matcher.test(file.path);
    }));
  }

  return combine(_.compact(pipeline));
};
