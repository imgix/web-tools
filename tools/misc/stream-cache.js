var _ = require('lodash'),
    through = require('through2'),
    vinylFS = require('vinyl-fs');

function StreamCache() {
  this.cache = {};
}

StreamCache.prototype.get = function (id) {
  return this.cache[id];
};

StreamCache.prototype.put = function (id) {
  var th = this,
      files = [];

  return through.obj(
    function transform(chunk, encoding, callback) {
        this.push(chunk);
        files.push(chunk.path);
        callback();
      },
    function flush(done) {
        if (files.length) {
          th.cache[id] = vinylFS.src(files);
        }

        done();
      }
  );
};

module.exports = StreamCache;
