var _ = require('lodash'),
    fs = require('fs'),
    URI = require('uri-js'),
    runSequence = require('run-sequence'),
    chromeLoad = require('../misc/chrome-load.js');

module.exports = function setUpTasks(gulp) {
  var serverConfig = _.get(gulp, 'webToolsConfig.server');

  if (!serverConfig) {
    return;
  }

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
    notes: ['The task will finish once the server has started, but the server will run in the background until the `serve-stop` task is called.'],
    category: 'main',
    weight: 2
  });

  gulp.task('serve-start', function serveStartTask(done) {
    var express,
        app,
        middlewareStack,
        protocol,
        server;

    // If the server is already running, no need to do anything
    if (serverConfig.running) {
      done();
      return;
    } else {
      serverConfig.running = {};
    }

    express = require('express');
    app = serverConfig.running.app = express();

    // Add logging via Morgan middleware
    if (_.get(serverConfig, 'options.logs')) {
      app.use(require('morgan')());
    }

    // Add gzipping via compression middleware
    if (_.get(serverConfig, 'options.gzip')) {
      app.use(require('compression')());
    }

    middlewareStack = _.castArray(serverConfig.middleware || function (app, config) {
      app.use(express.static(config.destPath));
    });

    // Apply each middleware in the stack, in order
    _.each(middlewareStack, function applyMiddleware(middleware) {
      if (_.isString(middleware)) {
        middleware = gulp.middlewareCache.get(middleware);
      }

      if (_.isFunction(middleware)) {
        middleware(app, gulp.webToolsConfig);
      }
    });

    if (serverConfig.ssl) {
      protocol = require('https');
      server = protocol.createServer({
        key: fs.readFileSync(serverConfig.key),
        cert: fs.readFileSync(serverConfig.cert),
        requestCert: false,
        rejectUnauthorized: false
      }, app);
    } else {
      protocol = require('http');
      server = protocol.createServer(app);
    }

    serverConfig.running.server = server;

    // Allow server to be destroyed
    server._connectionMap = {};

    server.on('connection', function onConnection(connection) {
      var th = this,
          key = connection.remoteAddress + ':' + connection.remotePort;

      th._connectionMap[key] = connection;

      connection.once('close', function onClose() {
        delete th._connectionMap[key];
      });
    }.bind(server));

    server.destroy = function () {
      var th = this;

      return new Promise(function constructPromise(resolve) {
        th.close(resolve);

        _.invokeMap(th._connectionMap, 'destroy');
      });
    }.bind(server);

    server.listen(serverConfig.port, done);
  }, {
    description: 'Start a local server for this project.',
    notes: ['The task will finish once the server has started, but the server will run in the background until the `serve-stop` task is called.'],
    category: 'serve'
  });

  gulp.task('serve-stop', function serveStopTask() {
    var running = serverConfig.running,
        promises;

      delete serverConfig.running;

      promises = _.map(running, function shutdownService(service, serviceName) {
        var closeFunction = service.destroy || service.close || undefined;

        return Promise.resolve(_.isFunction(closeFunction) ? closeFunction.call(service) : undefined);
      });

    return Promise.all(promises);
  }, {
    description: 'Shut down local services for this project, if there\'s anything running.',
    category: 'serve'
  });

  gulp.task('serve-load', function serveLoadTask() {
    var loadURL = serverConfig.loadURL;

    if (!_.has(serverConfig, 'running')) {
      return;
    }

    if (!loadURL) {
      loadURL = URI.serialize({
        scheme: serverConfig.ssl ? 'https' : 'http',
        host: serverConfig.hostname || 'localhost',
        port: serverConfig.port || 9000
      });
    }

    return chromeLoad(loadURL);
  }, {
    description: 'Reload existing Chrome tabs that are pointing to the local server, or open a new tab if none exists.',
    category: 'serve'
  });
};
