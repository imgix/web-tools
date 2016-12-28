var _ = require('lodash'),
    gutil = require('gulp-util'),
    through = require('through2'),
    Q = require('q'),
    Selenium = require('selenium-standalone'),
    Webdriver = require('webdriverio'),
    Eyeball = require('./eyeball.js'),
    Jasmine = require('jasmine'),
    JasmineTerminalReporter = require('jasmine-terminal-reporter');

module.exports = function testAcceptance(options, appURL) {
  var PLUGIN_NAME = 'test-acceptance',
      jasmineInstance,
      seleniumServer;

  function log() {
    var messages = _.toArray(arguments);
    messages.splice(0, 0, gutil.colors.magenta(PLUGIN_NAME));
    gutil.log.apply(null, messages);
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
        drivers: {
            chrome: {
                version: 2.26
              }
          }
      },
    webdriverOptions: {
        logLevel: 'silent',
        coloredLogs: true
      },
    eyeballOptions: {
        screenshotRoot: './overwite_me',
        widths: [1024]
      }
  });

  // Manually map this option out just to make our config file less horrible
  options.webdriverOptions.desiredCapabilities = {
    browserName: 'chrome' //options.browser.toLowerCase()
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
        var th = this,
            browser;

        // Start the server to drive the browser
        Q.promise(function startSeleniumServer(resolve, reject) {
            log('Installing Selenium');
            Selenium.install(options.seleniumOptions, function seleniumInstallCallback(err) {
              if (err) {
                reject(err);
              } else {
                log('Starting Selenium');
                Selenium.start(options.seleniumOptions, function seleniumStartCallback(err, child) {
                  if (err) {
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
            log('Initializing Webdriver');
            browser = global.browser = Webdriver.remote(options.webdriverOptions);

            // Add waitForAngular
            browser.waitForAngular = function () {
              return browser.waitUntil(function checkAngular() {
                return browser.execute(function checkAngularInBrowser() {
                  // Adapted from http://stackoverflow.com/a/30540634
                  var injector,
                      $rootScope,
                      $http,
                      $timeout;

                  try {
                    if (document.readyState !== 'complete') {
                      return false; // Page not loaded yet
                    }

                    if (window.jQuery) {
                      if (window.jQuery.active) {
                        return false;
                      } else if (window.jQuery.ajax && window.jQuery.ajax.active) {
                        return false;
                      }
                    }

                    if (window.angular) {
                      if (!window.qa) {
                        // Used to track the render cycle finish after loading is complete
                        window.qa = {
                          doneRendering: false
                        };
                      }

                      // Get the angular injector for this app (change element if necessary)
                      injector = window.angular.element('body').injector();

                      // Store providers to use for these checks
                      $rootScope = injector.get('$rootScope');
                      $http = injector.get('$http');
                      $timeout = injector.get('$timeout');

                      // Check if digest is in progress
                      if ($rootScope.$$phase === '$apply' || $rootScope.$$phase === '$digest' || $http.pendingRequests.length !== 0) {
                        window.qa.doneRendering = false;
                        return false; // Angular digesting or loading data
                      }
                      if (!window.qa.doneRendering) {
                        // Set timeout to mark angular rendering as finished
                        $timeout(function markAsDone() {
                          window.qa.doneRendering = true;
                        }, 0);

                        return false;
                      }
                    }
                    return true;

                  } catch (error) {
                    return false;
                  }
                });
              }, 10 * 1000, 'Angular never became ready');
            };

            browser.init().url(appURL);
          })

        // Initialize Eyeball.js
        .then(function initEyeball() {
            log('Initializing Eyeball.js');
            return Eyeball.init(browser, options.eyeballOptions);
          })

        // Execute the tests
        .then(function executeJasmineTests() {
            var dfd = Q.defer();

            log('Executing Jasmine tests');

            jasmineInstance.onComplete(function jasmineCompleteCallback(didPass) {
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
            th.emit('error', err);
            return new gutil.PluginError(PLUGIN_NAME, err);
          })

        .finally(function cleanUp() {
            Q.Promise(function stopBrowser(resolve) {
                  // Shut down the webdriver
                  if (browser) {
                    log('Shutting down Webdriver browser');
                    browser.end().then(resolve);
                  } else {
                    resolve();
                  }
                })
              .then(_.partial(Q.Promise, function killSelenium(resolve) {
                  // Kill Selenium
                  if (seleniumServer) {
                    log('Killing Selenium');
                    seleniumServer.on('exit', _.ary(resolve, 0));
                    seleniumServer.kill();
                  } else {
                    resolve();
                  }
                }))
              .finally(flushCallback);
          });
      }
  );
};
