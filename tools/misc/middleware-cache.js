var _ = require('lodash');

function MiddlewareCache() {
  this.cache = {};
}

MiddlewareCache.prototype.get = function (id) {
  return this.cache[id];
};

MiddlewareCache.prototype.put = function (id, module) {
  var th = this;

  if (_.isFunction(module)) {
    th.cache[id] = module;
  } else if (_.isString(module)) {
    // Proxy the middleware so we don't actually run require() until we need to
    th.cache[id] = function proxyMiddleware() {
      return require(module).apply(null, arguments);
    };
  }
};

module.exports = MiddlewareCache;
