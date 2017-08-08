var _ = require('lodash'),
    express = require('express'),
    STATIC_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year;

module.exports = function confgureServer(config, app) {
  var app = app || express();

  if (_.get(config, 'server.options.logs')) {
    app.use(require('morgan')('dev'));
  }

  if (_.get(config, 'server.options.gzip')) {
    app.use(require('compression')());
  }

  app.use('\.html$', express.static(config.destPath));

  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge', STATIC_CACHE_AGE),
    index: false
  }));

  // Fall back to serving index, if no file is found
  app.get('/', function serveIndex(request, response) {
    return response.sendFile('index.html', {
      root: config.appAssets.html.dest
    });
  });

  return app;
};
