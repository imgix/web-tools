var _ = require('lodash'),
    fs = require('fs'),
    URI = require('uri-js'),
    runSequence = require('run-sequence'),
    chromeLoad = require('../misc/chrome-load.js');

module.exports = function setUpTasks(gulp) {
  var serverConfig = _.get(gulp, 'webToolsConfig.server'),
      serverURL;

  if (!serverConfig) {
    return;
  }

  serverURL = URI.serialize(serverConfig);

  runSequence = runSequence.use(gulp);

  // Main serve task:
  gulp.task('serve', function serveTask(done) {
    runSequence(
      'serve-start',
      'serve-load',
      done
    );
  }, {
    description: 'Start a local server for this project and view it in Chrome.',
    notes: ['The task will finish once the server has started, but the server will run in the background until the `stop-server` task is called.'],
    category: 'main',
    weight: 2
  });

  gulp.task('serve-start', function serveStartTask(done) {
    var app,
        express,
        protocol;

    // If the server is already running, no need to do anything
    if (serverConfig.instance) {
      done();
      return;
    }

    if (_.isFunction(serverConfig.setup)) {
      app = serverConfig.setup(gulp.webToolsConfig);
    } else if (serverConfig.setup === 'spa') {
      app = require('../servers/server.spa.js')(gulp.webToolsConfig);
    } else if (serverConfig.setup === 'site') {
      app = require('../servers/server.site.js')(gulp.webToolsConfig);
    } else {
      express = require('express');
      app = express();
      app.use(express.static(gulp.webToolsConfig.destPath));
    }

    if (serverConfig.ssl) {
      protocol = require('https');
      serverConfig.instance = protocol.createServer({
        key: fs.readFileSync(serverConfig.key),
        cert: fs.readFileSync(serverConfig.cert),
        requestCert: false,
        rejectUnauthorized: false
      }, app);
    } else {
      protocol = require('http');
      serverConfig.instance = protocol.createServer(app);
    }

    serverConfig.instance.listen(serverConfig.port, done);
  }, {
    description: 'Start a local server for this project.',
    notes: ['The task will finish once the server has started, but the server will run in the background until the `stop-server` task is called.'],
    category: 'serve'
  });

  gulp.task('serve-stop', function serveStopTask() {
    if (!!serverConfig.instance) {
      serverConfig.instance.close();
      delete serverConfig.instance;
    }
  }, {
    description: 'Shut down the local server for this project, if it\'s running.',
    category: 'serve'
  });

  gulp.task('serve-load', function serveLoadTask() {
    return chromeLoad(serverURL);
  }, {
    description: 'Reload existing Chrome tabs that are pointing to the local server, or open a new tab if none exists.',
    category: 'serve'
  });
};
