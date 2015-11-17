var _ = require('lodash'),
    gutil = require('gulp-util'),
    through = require('through2'),
    Q = require('q'),
    Selenium = require('selenium-standalone'),
    WebdriverJSAngular = require('webdriverjs-angular'),
    Eyeball = require('./eyeball.js'),
    Jasmine = require('jasmine'),
    JasmineTerminalReporter = require('jasmine-terminal-reporter');

module.exports = function testIntegration(options, appURL) {
  var PLUGIN_NAME = 'test-integration',
      jasmineInstance,
      seleniumServer;

  function log(message, error) {
    gutil.log(gutil.colors.magenta(PLUGIN_NAME), message);
  }

  function error(message) {
    // return new gutil.PluginError(PLUGIN_NAME, message);
  }

  options = _.defaultsDeep({}, options, {
    browser: 'Firefox',
    jasmineOptions: {
        timeout: 30 * 1000 // The more breakpoints we choose for screenshots, the higher this will need to be
      },
    jasmineReporterOptions: {
        showColors: true,
        includeStackTrace: false
      },
    seleniumOptions: {
        host: 'localhost',
        port: 4444,
        role: 'hub',
        path: '/wd/hub/status'
      },
    webdriverOptions: {
        logLevel: 'silent',
        coloredLogs: true,
        ngRoot: 'html'
      },
    eyeballOptions: {
        screenshotRoot: './overwite_me',
        widths: [1024]
      }
  });

  // Manually map this option out just to make our config file less horrible
  options.webdriverOptions.desiredCapabilities = {
    browserName: options.browser.toLowerCase()
  };

  // Initialize Jasmine
  jasmineInstance = new Jasmine();
  jasmineInstance.jasmine.DEFAULT_TIMEOUT_INTERVAL = options.jasmineOptions.timeout;
  jasmineInstance.addReporter(new JasmineTerminalReporter(options.jasmineReporterOptions));

  return through.obj(
    function transform(chunk, encoding, transformCallback) {
        this.push(chunk);
        jasmineInstance.addSpecFile(chunk.path);
        transformCallback();
      },
    function flush(flushCallback) {
        var stream = this;

        // Start the server to drive the browser
        Q.promise(function startSeleniumServer(resolve, reject) {
            log('Starting Selenium');
            Selenium.install(function(err) {
              if (err) {
                error(err);
                reject(err);
              } else {
                Selenium.start({
                  seleniumArgs: options.seleniumOptions
                }, function seleniumCallback(err, child) {
                  if (err) {
                    error(err);
                    reject(err);
                  } else {
                    log('Successfully started Selenium');
                    seleniumServer = child;
                    resolve();
                  }
                });
              }
            });
          })

        // Spin up the webdriver
        .then(function initWebdriver() {
            var dfd = Q.defer();

            log('Initializing Webdriver');
            GLOBAL.browser = WebdriverJSAngular.remote(options.webdriverOptions);
            GLOBAL.browser.init(dfd.reject);

            log('Initializing Eyeball.js');
            Eyeball.init(GLOBAL.browser, options.eyeballOptions);

            log('Setting browser URL to ' + appURL);
            GLOBAL.browser.url(appURL);

            dfd.resolve();

            return dfd.promise;
          })

        // Execute the tests
        .then(function executeJasmineTests() {
            var dfd = Q.defer();

            log('Executing Jasmine tests');

            jasmineInstance.onComplete(function(didPass) {
              if (didPass) {
                dfd.resolve();
              } else {
                dfd.reject();
              }
            });

            jasmineInstance.execute();

            return dfd.promise;
          })

        // Catch errors
        .catch(function onError(err) {
            error(err);
            stream.emit('error', err);
          })

        .finally(function cleanUp() {
            Q.Promise(function stopBrowser(resolve) {
              // Shut down the webdriver
              if (GLOBAL.browser) {
                log('Shutting down Webdriver browser');
                // GLOBAL.browser.end().then(_.ary(resolve, 0));
                GLOBAL.browser.end().then(resolve);
              } else {
                resolve();
              }
            }).then(_.partial(Q.Promise, function killSelenium(resolve) {
              // Kill Selenium
              if (seleniumServer) {
                log('Killing Selenium');
                seleniumServer.on('exit', _.ary(resolve, 0));
                seleniumServer.kill();
              } else {
                resolve();
              }
            })).finally(flushCallback);
          });
      }
  );
};
