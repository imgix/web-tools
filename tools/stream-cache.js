var _ = require('lodash'),
    through = require('through2');

module.exports = (function() {
  var streamCache = {};

  function get(id) {
    return streamCache[id];
  }

  function put(id, data) {
    streamCache[id] = data;
  }

  return {
    get: get,
    put: function (id) {
        return through.obj(null, null, function flush(flushCallback) {
          put(id, this.pipe(through.obj({end: false})));
          flushCallback();
        });
      }
  };
})();
