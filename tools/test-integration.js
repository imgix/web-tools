var _ = require('lodash'),
    through = require('through2'),
    Q = require('q'),
    Selenium = require('selenium-standalone'),
    WebdriverJSAngular = require('webdriverjs-angular'),
    Eyeball = require('./eyeball.js'),
    Jasmine = require('jasmine'),
    JasmineTerminalReporter = require('jasmine-terminal-reporter');

module.exports = function testIntegration(config) {
  var jasmineInstance,
      // The more breakpoints we choose for screenshots, the higher this will need to be
      jasmineTimeoutInterval = 30 * 1000,

      seleniumServer,
      seleniumOptions = {
          host: 'localhost',
          port: 4444,
          role: 'hub',
          path: '/wd/hub/status'
        },
      webdriverOptions = {
          logLevel: 'silent',
          coloredLogs: true,
          ngRoot: 'html',
          desiredCapabilities: {
              browserName: config.webdriver.browser.toLowerCase()
            }
        },
      eyeballOptions = {
          screenshotRoot: config.webdriver.screenshotPath,
          widths: config.webdriver.defaultWidths
        };

  // Initialize Jasmine
  jasmineInstance = new Jasmine();
  jasmineInstance.jasmine.DEFAULT_TIMEOUT_INTERVAL = jasmineTimeoutInterval;
  jasmineInstance.addReporter(new JasmineTerminalReporter({
    showColors: true,
    includeStackTrace: false
  }));

  return through.obj(
    function transform(chunk, encoding, callback) {
        this.push(chunk);
        jasmineInstance.addSpecFile(chunk.path);
        callback();
      },
    function flush(done) {
        var stream = this;

        // Start the server to drive the browser
        Q().then(Q.promise(function startSeleniumServer(resolve, reject) {
              Selenium.install(function(err) {
                if (err) {
                  reject(err);
                } else {
                  Selenium.start({
                    seleniumArgs: seleniumOptions
                  }, function seleniumCallback(err, child) {
                    if (err) {
                      reject(err);
                    } else {
                      seleniumServer = child;
                      resolve();
                    }
                  });
                }
              });
            })

          // Spin up the webdriver
          .then(function initWebdriver() {
              GLOBAL.browser = WebdriverJSAngular.remote(webdriverOptions);
              GLOBAL.browser.init(dfd.reject);

              Eyeball.init(GLOBAL.browser, eyeballOptions);

              GLOBAL.browser.url(localURL);
            }))

          // Execute the tests
          .then(Q.Promise(function executeJasmineTests(done) {
              jasmineInstance.onComplete(done);
              jasmineInstance.execute();
            }))

          // Catch errors
          .catch(function onError(error) {
              stream.emit('error', err);
            })

          .finally(function cleanUp() {
              // Shut down the webdriver
              if (GLOBAL.browser) {
                GLOBAL.browser.end(done);
              }

              // Kill Selenium
              if (seleniumServer) {
                seleniumServer.kill();
              }

              // Fire the flush callback
              done();
            });
      }
  );
};
