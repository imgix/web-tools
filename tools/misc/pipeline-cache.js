var _ = require('lodash');

function PipelineCache(gulp) {
  this.gulp = gulp;
  this.cache = {};
}

PipelineCache.prototype.get = function (id) {
  return this.cache[id];
};

PipelineCache.prototype.put = function (id, module) {
  var th = this;

  if (_.isFunction(module)) {
    th.cache[id] = module(th.gulp);
  } else if (_.isString(module)) {
    // Proxy the pipeline so we don't actually run require() until we need to
    th.cache[id] = function proxyPipeline() {
      return require(module)(th.gulp).apply(null, arguments);
    };
  }
};

module.exports = PipelineCache;
