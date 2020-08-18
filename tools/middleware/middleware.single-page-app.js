var _ = require('lodash'),
    express = require('express'),
    STATIC_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year;

module.exports = function configureServer(app, config) {
  function serveIndex(request, response) {
    return response.sendFile('index.html', {
      root: config.appAssets.html.dest,
      headers: {
          'Cache-Control': 'private',
          'X-Frame-Options': 'DENY',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-XSS-Protection': '1; mode=block',
          'X-Content-Type-Options': 'nosniff'
        }
    });
  }

  app.use(function checkForIndex(request, response, next) {
    var isIndex = request.url.match(/index\.html$/);

    if (isIndex) {
      serveIndex(request, response);
    } else {
      next();
    }
  });

  // Serve static assets
  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge', STATIC_CACHE_AGE),
    index: false
  }));

  // Fall back to serving index, if no file is found
  app.get('*', serveIndex);

  return app;
};
