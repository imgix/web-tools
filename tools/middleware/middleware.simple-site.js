var _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    express = require('express'),
    STATIC_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year;;

module.exports = function configureServer(app, config) {
  var fallbackFile = _.get(config, 'server.fallbackFile');

  app.use('\.html$', express.static(config.destPath));

  // Serve static assets
  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge', STATIC_CACHE_AGE),
    index: false
  }));

  // Fall back to serving index, if no file is found
  app.get('/', function serveIndex(request, response) {
    return response.sendFile('index.html', {
      root: config.destPath
    });
  });

  if (fallbackFile && fs.existsSync(path.join(config.destPath, fallbackFile))) {
    // Fall back to serving index, if no file is found
    app.get('*', function serveFallback(request, response) {
      return response.sendFile(fallbackFile, {
        root: config.destPath,
        headers: {
            'Cache-Control': 'private, no-cache, max-age=0'
          }
      });
    });
  }
};
