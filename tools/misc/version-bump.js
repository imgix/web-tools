var _ = require('lodash'),
    through = require('through2'),
    semver = require('semver'),
    gutil = require('gulp-util');

module.exports = function versionBump(bumpBy) {
  var PLUGIN_NAME = 'version-bump',
      BUMP_OPTIONS = ['major', 'minor', 'patch'],
      oldVersion,
      newVersion;

  function log() {
    var messages = _.toArray(arguments);
    messages.splice(0, 0, gutil.colors.magenta(PLUGIN_NAME));
    gutil.log.apply(null, messages);
  }

  function error() {
    var messages = _.toArray(arguments);
    messages.splice(0, 0, PLUGIN_NAME);
    return new gutil.PluginError.apply(null, messages);
  }

  return through.obj(
    function transform(chunk, enc, callback) {
        var jsonData;

        try {
          jsonData = JSON.parse(chunk.contents);
        } catch (err) {
          error('File ' + chunk.path + ' is not a JSON file.');
        }

        if (_.isUndefined(jsonData.version)) {
          error('File ' + chunk.path + ' has no version.');
        } else {
          if (!oldVersion) {
            oldVersion = jsonData.version;

            // Calculate new version
            if (!!bumpBy && semver.valid(bumpBy)) {
              newVersion = bumpBy;
            } else {
              if (!_.includes(BUMP_OPTIONS, bumpBy)) {
                bumpBy = 'minor';
              }

              // Set newVersion by incrementing oldVersion
              newVersion = semver.inc(oldVersion, bumpBy);
            }
          }

          jsonData.version = newVersion;
          chunk.contents = Buffer.from(JSON.stringify(jsonData, false, '  ') + '\n');

          this.push(chunk);
        }

        callback();
      },
    function flush(done) {
        log(
          gutil.colors.green('Updated version to ' + newVersion),
          gutil.colors.grey('(Previously ' + oldVersion + ')')
        );
      }
  );
};
