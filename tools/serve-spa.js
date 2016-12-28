var _ = require('lodash'),
    express = require('express'),
    STATIC_CACHE_AGE = 365 * 24 * 60 * 60 * 1000; // 1 year;

module.exports = function confgureServer(config) {
  var app = express();

  function serveIndex(request, response) {
    return response.sendFile('index.html', {
      root: config.appAssets.html.dest,
      headers: {
          'Cache-Control': 'private'
        }
    });
  }

  if (_.get(config, 'server.options.gzip')) {
    app.use(require('compression')());
  }

  app.use(function checkForIndex(request, response, next) {
    var isIndex = request.url.match(/index\.html$/);

    if (isIndex) {
      serveIndex(request, response);
    } else {
      next();
    }
  });

  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge', STATIC_CACHE_AGE),
    index: false
  }));

  // Fall back to serving index, if no file is found
  app.get('*', serveIndex);

  return app;
};
