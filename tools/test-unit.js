var path = require('path'),
    _ = require('lodash'),
    through = require('through2'),
    KarmaServer = require('karma').Server;

module.exports = function testUnit(options) {
  var karmaFiles = [];

  options = _.defaultsDeep({}, options, {
    // Honestly, these are the only three options you should care about
    // Overwriting any of the other options will probably start fires
    reporters: ['progress'],
    browsers: ['PhantomJS'],
    captureTimeout: 20 * 1000,

    autoWatch: false,
    singleRun: true,
    frameworks: [
        'jasmine',
        'jasmine-matchers'
      ],
    plugins: [
        // We have to require() these because otherwise Karma will look in the wrong place
        require('karma-jasmine'),
        require('karma-jasmine-matchers'),
        require('karma-ng-html2js-preprocessor'),
        require('karma-phantomjs-launcher'),
        require('karma-chrome-launcher'),
        require('karma-firefox-launcher'),
        require('karma-safari-launcher')
      ],
    preprocessors: {
        '**/*.tmpl': 'ng-html2js'
      },
    ngHtml2JsPreprocessor: {
        moduleName: 'override.me',
        cacheIdFromPath: function(filePath) {
            return path.basename(filePath);
          },
      }
  });

  return through.obj(
    function transform(chunk, encoding, callback) {
        this.push(chunk);
        karmaFiles.push(chunk.path);
        callback();
      },
    function flush(done) {
        var karmaOptions = _.merge({}, options, {
          files: karmaFiles
        });

        // Use _.ary here so we don't pass any args to the callback
        new KarmaServer(karmaOptions, _.ary(done, 0)).start();
      }
  );
}
