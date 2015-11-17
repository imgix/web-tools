var _ = require('lodash'),
    through = require('through2'),
    vinylFS = require('vinyl-fs');

module.exports = (function() {
  var streamCache = {};

  return {
    get: function (id) {
        return streamCache[id];
      },
    put: function (id) {
        var files = []

        return through.obj(
          function transform(chunk, encoding, callback) {
              this.push(chunk);
              files.push(chunk.path);
              callback();
            },
          function flush(done) {
              if (files.length) {
                streamCache[id] = vinylFS.src(files);
              }

              done();
            }
        );
      }
  };
})();
