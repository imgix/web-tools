var _ = require('lodash'),
    args = require('yargs').argv,
    versionBump = require('../misc/version-bump.js');

module.exports = function setUpTask(gulp) {
  var versioningSrc = _.get(gulp, 'webToolsConfig.versioning.src');

  if (!versioningSrc) {
    return;
  }

  gulp.task('version', gulp.series(function versionTask() {
    return gulp.src(versioningSrc, {base: '.'})
        .pipe(versionBump(args.bump))
        .pipe(gulp.dest('.'));
  }), {
    description: 'Bump this project\'s semantic version number.',
    category: 'misc',
    arguments: {
        'bump': '[Optional] Specifies which part of the version number (major, minor, patch) should be bumped.'
      }
  });
};
