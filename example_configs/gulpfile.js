var gulp = require('gulp'),
    setupGulpTasks = require('web-tools/tools/gulp-tasks', gulp),
    configFactory = require('./imgix.config.js');

gulp = setupGulpTasks(gulp, configFactory);
