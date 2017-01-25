var _ = require('lodash'),
    express = require('express');

module.exports = function confgureServer(config) {
  var app = express();

  if (_.get(config, 'server.options.gzip')) {
    app.use(require('compression')());
  }

  app.use('\.html$', express.static(config.destPath));

  app.use(express.static(config.destPath, {
    maxAge: _.get(config, 'server.options.cacheAge'),
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
