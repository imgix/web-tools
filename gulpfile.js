var _ = require('lodash'),
    path = require('path'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    args = require('yargs').argv,
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    jsonlint = require('gulp-json-lint'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs'),
    jsonlintReporter = require('reporter-plus/jsonlint'),
    gulpMetadata = require('./tools/gulp-metadata.js')(gulp);

/*--- Check Tasks ---*/
gulp.task('check-tools', function() {
  return gulp.src(path.join('tools', '*.js'))
    .pipe(jshint(_.merge(
        {lookup: false},
        require('./runcoms/rc.jshint.json')
      )))
    .pipe(jshint.reporter(jshintReporter))
    .pipe(jscs({
        configPath: path.join(__dirname, '.', 'runcoms', 'rc.jscs.json')
      }))
    .pipe(jscs.reporter(jscsReporter.path));
});
gulpMetadata.addTask('check-tools', {
  description: 'Run all tool files through JSHint and JSCS',
  category: 'checker'
});

gulp.task('check-runcoms', function() {
  return gulp.src(path.join('runcoms', '*.json'))
    .pipe(jsonlint())
    .pipe(jsonlint.report(jsonlintReporter));
});
gulpMetadata.addTask('check-runcoms', {
  description: 'Run all runcom files through JSONLint',
  category: 'checker'
});

/*--- Default Task --*/
gulp.task('default', function(done) {
  runSequence(
    'check-tools',
    'check-runcoms',
    done
  );
});
gulpMetadata.addTask('default', {
  description: 'Run the most important tasks for developing this project',
  category: 'main',
  weight: 0
});

/*--- Versioning Task ---*/
gulp.task('version', function() {
  var versionBump = require('./tools/version-bump.js');

  return gulp.src(path.join('.', 'package.json'), {base: '.'})
    .pipe(versionBump(args.bump))
    .pipe(gulp.dest('.'));
});
gulpMetadata.addTask('version', {
  description: 'Bump this project\'s semantic version number.',
  category: 'misc',
  arguments: {
      'bump': '[Optional] Specifies which part of the version number (major, minor, patch) should be bumped.'
    }
});

/*--- Help task ---*/
gulp.task('help', function() {
  gutil.log(gulpMetadata.describeAll());
});
gulpMetadata.addTask('help', {
  description: 'List all available Gulp tasks and arguments.',
  category: 'misc',
  weight: 999
});
