var _ = require('lodash'),
    express = require('express'),
    STATIC_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year;

module.exports = function configureServer(config, app) {
  var app = app || express();

  function serveIndex(request, response) {
    return response.sendFile('index.html', {
      root: config.appAssets.html.dest,
      headers: {
          'Cache-Control': 'private, no-cache, max-age=0'
        }
    });
  }

  if (_.get(config, 'server.options.logs')) {
    app.use(require('morgan')('dev'));
  }

  if (_.get(config, 'server.options.gzip')) {
    app.use(require('compression')());
  }

  // Catch direct requests to index.html first, so they aren't served statically
  app.get(/index\.html$/, serveIndex);

  // Serve static assets
  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge', STATIC_CACHE_AGE),
    index: false
  }));

  // Fall back to serving index, if no file is found
  app.get('*', serveIndex);

  return app;
};
