var _ = require('lodash'),
    path = require('path'),
    fs = require('fs'),
    mkdirp = require('mkdirp'),
    rimraf = require('rimraf'),
    Q = require('q'),
    gm = require('gm'),
    resemble = require('node-resemble-js');

module.exports = (function constructor() {
  var defaultOptions = {
    screenshotRoot: './',
    baselineSubdir: 'screens-baseline',
    newCapturesSubdir: 'screens-%t', // %t is for timestamp
    diffsSubdir: 'screens-%t-diffs', // %t is for timestamp
    fileNamePattern: '%g-%n-%w.png', // %g for groupID, %n for area name, %w for browser width
    widths: [1024],
    mismatchTolerance: 0.05
  };

  return {
    init: function (browser, options) {
        var now = Date.now(),
            tempDir,
            mkdir = Q.nfbind(mkdirp),
            rm = Q.nfbind(rimraf);

        // Viewport dimension functions
        function measureBrowser() {
          var dfd = Q.defer();

          browser.execute(function getViewportDimensionsInBrowser() {
            var d = window.document,
                body = d.body,
                html = d.documentElement;

            window.scrollTo(0, 0);

            return {
              windowWidth: Math.max(html.clientWidth, window.innerWidth || 0),
              windowHeight: Math.max(html.clientHeight, window.innerHeight || 0),
              documentWidth: html.scrollWidth,
              documentHeight: html.scrollHeight,
              devicePixelRatio: window.devicePixelRatio
            };
          }).then(function resolveWithValue(result) {
            dfd.resolve(result.value);
          });

          return dfd.promise;
        }

        function measureElementInBrowser(selector) {
          var dfd = Q.defer();

          browser.execute(function getElementDimensionsInBrowser(selector) {
            var d = window.document,
                element = d.querySelector(selector),
                rect = element.getBoundingClientRect();

            window.scrollTo(0, 0);

            return {
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
            };
          }, selector).then(function resolveWithValue(result) {
            dfd.resolve(result.value);
          });

          return dfd.promise;
        }

        function setBrowserWidth(width) {
          return measureBrowser().then(function setWidth(dimensions) {
            var dfd = Q.defer();

            browser.setViewportSize({
              width: width,
              height: dimensions.windowHeight
            }, false).pause(100).call(dfd.resolve);

            return dfd.promise;
          });
        }

        function getBrowserScrollTop() {
          var dfd = Q.defer();

          browser.execute(function getWindowScrollTopInBrowser() {
            return window.pageYOffset;
          }).then(function resolveWithValue(result) {
            dfd.resolve(result.value);
          });

          return dfd.promise;
        }

        function setBrowserScrollTop(y) {
          var dfd = Q.defer();

          browser.execute(function setWindowScrollTopInBrowser(y) {
            window.scrollTo(0, y);

            return window.pageYOffset;
          }, y).then(function resolveWithValue(result) {
            dfd.resolve(result.value);
          });

          return dfd.promise;
        }

        // Viewport capture functions
        function saveAreaScreenshotsForAllWidths(widths, areas, destination, fileNamePattern) {
          var viewportObjects = [];

          return _.reduce(widths, function makePromise(runningPromise, width) {
            return runningPromise
              .then(_.partial(getViewportDataForWidth, width, areas))
              .then(viewportObjects.push.bind(viewportObjects));
          }, new Q())

            .then(function saveAreaScreenshots() {
                return Q.all(_.map(viewportObjects, function loopOverViewportObjects(viewportObject) {
                  var patternForWidth = fileNamePattern.replace(/%w/g, viewportObject.width);

                  return Q.all(_.map(viewportObject.areas, function loopOverAreaObjects(area) {
                    var fileName = patternForWidth.replace(/%n/g, area.name),
                        fullPath = path.join(destination, fileName);

                    return Q.nbind(area.screenshot.write, area.screenshot)(fullPath)
                      .then(function getObject() {
                          return {
                            name: area.name,
                            selector: area.selector,
                            screenshot: fullPath,
                            width: viewportObject.width
                          };
                        });
                  }));
                }));
              })

            .then(_.flatten)

            .catch(_.partial(rm, destination));
        }

        function getViewportDataForWidth(width, areas) {
          var viewportObject = {
            width: width
          };

          function cacheOnViewportObject(key, value) {
            viewportObject[key] = value;

            return viewportObject;
          }

          return setBrowserWidth(width)

            // Get the browser dimensions
            .then(measureBrowser)

            // Cache the browser dimensions on the viewport object
            .then(_.partial(cacheOnViewportObject, 'dimensions'))

            // Capture a full screenshot of the viewport
            .then(_.partial(screenshotFullViewport, viewportObject))

            // Cache the resultant screenshot image on the viewport object
            .then(_.partial(cacheOnViewportObject, 'screenshot'))

            // Crop the screenshot for each area
            .then(_.partial(screenshotAllAreasInViewport, areas, viewportObject))

            // Cache the resultant array of area objects on the viewport object
            .then(_.partial(cacheOnViewportObject, 'areas', _));
        }

        function screenshotFullViewport(viewportObject) {
          var fileName = _.uniqueId('screenshot-') + '-' + viewportObject.width + '.png',
              fullPath = path.join(tempDir, fileName);

          return Q.nbind(browser.screenshot, browser)()
            .then(function makeImageFromData(result) {
                var image = gm(new Buffer(result.value, 'base64'));

                return Q.nbind(image.write, image)(fullPath);
              })
            .then(function getFullPath() {
                return fullPath;
              });
        }

        function screenshotAllAreasInViewport(areas, viewportObject) {
          function screenshotAreaInViewport(area, viewportObject) {
            var areaObject = {
              name: area.name,
              selector: area.selector
            };

            function cacheOnAreaObject(key, value) {
              areaObject[key] = value;

              return areaObject;
            }

            // Measure the element in the current viewport
            return measureElementInBrowser(area.selector)

              // Cache the resultant rectangle on the area object
              .then(_.partial(cacheOnAreaObject, 'rectangle'))

              // Crop the viewport screenshot to the area's rectangle
              .then(function cropViewportScreenshotToAreaRectangle() {
                  var rect = areaObject.rectangle;

                  return gm(viewportObject.screenshot).crop(rect.width, rect.height, rect.left, rect.top);
                })

              // Cache the resultant screenshot image on the area object
              .then(_.partial(cacheOnAreaObject, 'screenshot'));
          }

          return Q.all(_.map(areas, _.partial(screenshotAreaInViewport, _, viewportObject)));
        }

        function compareToPriorScreenshots(areas, mismatchTolerance, baselineDir, diffsDir) {
          return Q.all(_.map(areas, function compareAreaToPriorArea(areaObject) {
            var dfd = Q.defer(),
                fileName = path.basename(areaObject.screenshot),
                baselineFile = path.join(baselineDir, fileName),
                diffFile = path.join(diffsDir, fileName);

            fs.stat(baselineFile, function statCallback(err, stats) {
              areaObject.passedComparison = true;

              // No stats means no baseline, so just move this file
              if (!stats) {
                fs.rename(areaObject.screenshot, baselineFile, function renameCallback(err) {
                  if (err) {
                    dfd.reject(err);
                  } else {
                    areaObject.screenshot = baselineFile;
                    dfd.resolve();
                  }
                });

              // If there ARE stats, there's a baseline to compare to
              } else {
                resemble(baselineFile).compareTo(areaObject.screenshot).onComplete(function afterComparison(data) {
                  areaObject.misMatchPercentage = Number(data.misMatchPercentage);
                  areaObject.passedComparison = (areaObject.misMatchPercentage <= mismatchTolerance);

                  if (areaObject.passedComparison) {
                    // If it matches the baseline, delete the dupe file
                    fs.unlink(areaObject.screenshot, function deleteFileCallback(err) {
                      if (err) {
                        dfd.reject(err);
                      } else {
                        areaObject.screenshot = baselineFile;
                        dfd.resolve();
                      }
                    });
                  } else {
                    // If it doesn't match the baseline, save the file and make a new diff file
                    data.getDiffImage().pack().on('end', function onEnd(err) {
                      if (err) {
                        dfd.reject(err);
                      } else {
                        areaObject.diff = diffFile;
                        dfd.resolve();
                      }
                    }).pipe(fs.createWriteStream(diffFile));
                  }
                });
              }
            });

            return dfd.promise.then(function exportResults() {
              return areaObject;
            });
          }));
        }

        // Set up options
        options = _.defaults(options || {}, defaultOptions);

        // The Temporary directory name is based on the current time
        tempDir = path.join(options.screenshotRoot, '.temp-' + now);

        browser.checkRendering = function (groupID, areas, widths) {
          var baselineDir = path.join(
                  options.screenshotRoot,
                  groupID,
                  options.baselineSubdir
                ),
              newDir = path.join(
                  options.screenshotRoot,
                  groupID,
                  options.newCapturesSubdir.replace(/%t/g, now)
                ),
              diffsDir = path.join(
                  options.screenshotRoot,
                  groupID,
                  options.diffsSubdir.replace(/%t/g, now)
                ),
              fileNamePattern = options.fileNamePattern.replace(/%g/g, groupID),
              promise;

          promise = Q.all([
            // Make some dirrrrrrz
            mkdir(tempDir),
            mkdir(baselineDir),
            mkdir(newDir),
            mkdir(diffsDir)
          ])

            .then(_.partial(saveAreaScreenshotsForAllWidths,
                widths || options.widths,
                areas,
                newDir,
                fileNamePattern
              ))

            .then(_.partial(compareToPriorScreenshots,
                _,
                options.mismatchTolerance,
                baselineDir,
                diffsDir
              ))

            .then(function assembleResults(areaObjects) {
                var output = {};

                _.each(areaObjects, function areaObjectsLoop(areaObject) {
                  var group;

                  if (!output[areaObject.name]) {
                    output[areaObject.name] = {
                      allPassed: true,
                      passCount: 0,
                      failCount: 0,
                      widths: {}
                    };
                  }

                  group = output[areaObject.name];

                  if (!areaObject.passedComparison) {
                    group.allPassed = false;
                    group.failCount++;
                  } else {
                    group.passCount++;
                  }

                  group.widths[areaObject.width] = _.pick(areaObject,
                    'passedComparison',
                    'misMatchPercentage',
                    'screenshot',
                    'diff'
                  );
                });

                return output;
              })

            .catch(function onError(e) {
                console.error(e);
                console.trace();
              });

          // Sometimes you've gotta kill your dir-lings
          promise.finally(function cleanupDirs() {
            var readDir = Q.nfbind(fs.readdir);

            function rmIfEmpty(dir) {
              return readDir(dir).then(function readCallback(files) {
                if (!files.length) {
                  return rm(dir);
                }
              });
            }

            return Q.all([
              rm(tempDir),
              rmIfEmpty(baselineDir),
              rmIfEmpty(newDir),
              rmIfEmpty(diffsDir)
            ]);
          });

          return promise;
        };

        return browser;
      }
  };
})();
