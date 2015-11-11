var path = require('path'),
    _ = require('lodash'),
    through = require('through2'),
    KarmaServer = require('karma').Server;

module.exports = function testUnit(config) {
  var karmaFiles = [],
      karmaConfig;

  karmaConfig = {
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
        cacheIdFromPath: function(filePath) {
            return path.basename(filePath);
          },
        moduleName: config.ngModule
      },
    reporters: config.karma.reporters || ['progress'],
    browsers: config.karma.browsers || ['PhantomJS'],
    captureTimeout: config.karma.timeout || 20 * 1000
  };

  return through.obj(
    function transform(chunk, encoding, callback) {
        this.push(chunk);
        karmaFiles.push(chunk.path);
        callback();
      },
    function flush(done) {
        karmaConfig.files = karmaFiles;
        new KarmaServer(karmaConfig, _.ary(done, 0)).start();
      }
  );
}
