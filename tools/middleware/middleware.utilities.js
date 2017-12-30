var _ = require('lodash');

module.exports = function configureServer(app, config) {
  // Add logging via Morgan middleware
  if (_.get(config, 'options.logs')) {
    app.use(require('morgan')());
  }

  // Add gzipping via compression middleware
  if (_.get(config, 'options.gzip')) {
    app.use(require('compression')());
  }
};
