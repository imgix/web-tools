var _ = require('lodash'),
    path = require('path'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    args = require('yargs').argv,
    runSequence = require('gulp4-run-sequence'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    jsonlint = require('gulp-json-lint'),
    gulpMetadata = require('./tools/gulp-metadata.js').applyTo(gulp);

/*--- Check Tasks ---*/
gulp.task('check-tools', gulp.series(checkTools), {
  description: 'Run all tool files through JSHint and JSCS',
  category: 'checker'
});

gulp.task('check-runcoms', gulp.series(checkRuncoms), {
  description: 'Run all runcom files through JSONLint',
  category: 'checker'
});

/*--- Default Task --*/
gulp.task('default', gulp.series(defaultTask), {
  description: 'Run the most important tasks for developing this project',
  category: 'main',
  weight: 0
});

/*--- Versioning Task ---*/
gulp.task('version', gulp.series(version), {
  description: 'Bump this project\'s semantic version number.',
  category: 'misc',
  arguments: {
      'bump': '[Optional] Specifies which part of the version number (major, minor, patch) should be bumped.'
    }
});

/*--- Help task ---*/
gulp.task('help', gulp.series(help), {
  description: 'List all available Gulp tasks and arguments.',
  category: 'misc',
  weight: 999
});

function checkRuncoms() {
  return gulp.src(path.join('runcoms', '*.json'))
    .pipe(jsonlint())
}

function defaultTask(done) {
  runSequence(
    'check-tools',
    'check-runcoms',
    done
  );
}

function checkTools() {
  return gulp.src(path.join('tools', '**', '*.js'))
    .pipe(jshint(_.merge(
        {lookup: false},
        require('./runcoms/rc.jshint.json')
      )))
    .pipe(jscs({
        configPath: path.join(__dirname, '.', 'runcoms', 'rc.jscs.json')
      }))
}

function version() {
  var versionBump = require('./tools/misc/version-bump.js');

  return gulp.src(path.join('.', 'package.json'), {base: '.'})
    .pipe(versionBump(args.bump))
    .pipe(gulp.dest('.'));
}

function help(done) {
  gutil.log(gulpMetadata.metadata.describeAll());
  done();
}
