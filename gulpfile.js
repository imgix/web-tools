var _ = require('lodash'),
    path = require('path'),
    gulp = require('gulp-v3'),
    gutil = require('gulp-util'),
    args = require('yargs').argv,
    runSequence = require('run-sequence'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    jsonlint = require('gulp-json-lint'),
    jshintReporter = require('reporter-plus/jshint'),
    jscsReporter = require('reporter-plus/jscs'),
    jsonlintReporter = require('reporter-plus/jsonlint'),
    gulpMetadata = require('./tools/gulp-metadata.js').applyTo(gulp);

/*--- Check Tasks ---*/
gulp.task('check-tools', function() {
  return gulp.src(path.join('tools', '**', '*.js'))
    .pipe(jshint(_.merge(
        {lookup: false},
        require('./runcoms/rc.jshint.json')
      )))
    .pipe(jshint.reporter(jshintReporter))
    .pipe(jscs({
        configPath: path.join(__dirname, '.', 'runcoms', 'rc.jscs.json')
      }))
    .pipe(jscs.reporter(jscsReporter.path));
}, {
  description: 'Run all tool files through JSHint and JSCS',
  category: 'checker'
});

gulp.task('check-runcoms', function() {
  return gulp.src(path.join('runcoms', '*.json'))
    .pipe(jsonlint())
    .pipe(jsonlint.report(jsonlintReporter));
}, {
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
}, {
  description: 'Run the most important tasks for developing this project',
  category: 'main',
  weight: 0
});

/*--- Versioning Task ---*/
gulp.task('version', function() {
  var versionBump = require('./tools/misc/version-bump.js');

  return gulp.src(path.join('.', 'package.json'), {base: '.'})
    .pipe(versionBump(args.bump))
    .pipe(gulp.dest('.'));
}, {
  description: 'Bump this project\'s semantic version number.',
  category: 'misc',
  arguments: {
      'bump': '[Optional] Specifies which part of the version number (major, minor, patch) should be bumped.'
    }
});

/*--- Help task ---*/
gulp.task('help', function() {
  gutil.log(gulpMetadata.describeAll());
}, {
  description: 'List all available Gulp tasks and arguments.',
  category: 'misc',
  weight: 999
});
