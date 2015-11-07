var _ = require('lodash'),
    through2 = require('through2');

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
        return through2.obj(null, function flush(flushCallback) {
          put(id, this.pipe(through2.obj({end: false})));
          flushCallback();
        });
      }
  };
})();
