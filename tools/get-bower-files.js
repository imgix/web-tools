var _ = require('lodash'),
    mainBowerFiles = require('main-bower-files'),
    gulp = require('gulp'),
    gulpIf = require('gulp-if'),
    rename = require('gulp-rename'),
    filter = require('gulp-filter'),
    flatten = require('gulp-flatten');

modules.export = function getBowerFiles(options) {
  var fileList = {};

  options = _.defaultsDeep({}, options, {
    doRename: true,
    mainBowerFilesConfig: {
        paths: {
            bowerDirectory: './bower_components',
            bowerJson: './bower.json',
          }
      }
  });

  // Start with the main bower files for this app
  return mainBowerFiles(options.mainBowerFilesConfig)
    // Rename the files to match their package names (i.e. jquery-2.1.2.min.js => jquery.js)
    .pipe(gulpIf(options.doRename,
        rename(function(filepath) {
          console.log(filepath);
          filepath.basename = _.first(filepath.basename.split('.'));
        })
      ))

    // Flatten the files, in case they're set up strangely in their bower.json
    .pipe(flatten())

    // Filter the list to remove duplicates, in case there are overlapping dependencies
    .pipe(filter(function(file) {
        var filename = path.basename(file.path);

        if (!fileList[filename]) {
          fileList[filename] = true;
          return true;
        } else {
          return false;
        }
      }));
};
