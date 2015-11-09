# web-tools

**web-tools** is a repo for imgix's common front-end tooling, including test, server, and build systems.

**NOTE: This repo and README are works-in-progress**

## Overview

The apps in this repository are **single page applications**, served statically as a single HTML file and made interactive with [**AngularJS**](https://angularjs.org/), a JavaScript application framework developed by Google. They rely on shared imgix assets, app-specific assets, and third-party libraries, all of which are compiled and combined in a [build process](#more-about-gulp-build) into a single directory of development- or production-ready code.

### Project structure

- The `tools` directory contains a set of tools intended to be used as a part of a web application's development and build process. The most important tool is `gulp-tasks.js`, which provides a set of common Gulp tasks.
- The `runcoms` directory contains rulesets for various linters and code-quality tools. For more information, see [Code Analysis](#code-analysis) below.
- The `example_configs` directory contains a set of template configuration files that web projects can copy and tweak in order to set up their tools.

## Tooling

### Development tools

* [**NPM**](https://npmjs.com) (Node Package Manager) to install and manage packages needed for development, such as Gulp and Express.
* [**Bower**](http://bower.io/) to install and manage packages needed for the client side of the project, such as jQuery and Lodash.
* [**Gulp**](http://gulpjs.com) to run development tasks, such as linting files to check for mistakes, serving a local version of the site for testing, and packaging the project up for production.
* [**Express**](http://expressjs.com/) to serve a local version of the app for testing and development. It's a bit overkill, but it works.
* [**Jasmine**](http://jasmine.github.io/) to specify behavior and expectations for tests
* [**Karma**](https://karma-runner.github.io) to run unit tests, which test individual pieces of code at minimum granularity and maximum specificty. Karma runs these tests in [PhantomJS](http://phantomjs.org/), in a simulated version of a webpage.
* [**WebdriverIO**](http://webdriver.io/) to run integration tests, which test the complete application code by requesting a real version of the application from a local server and controlling a real browser using [Selenium Standalone](http://www.seleniumhq.org/). Webdriver also allows us to run **visual regression tests**, wherein we compare screenshots of the application in its current state to screenshots of the application from a known stable state to help us spot unexpected visual changes.

*Note:* The `/node_modules` and `/bower_components` directories should never be checked in—instead, each developer will install these dependencies separately after cloning the repo. This ensures that the files in the repo aren't cluttered up by files unrelated to the project, and makes it easier to upgrade dependencies if need be. The repo's `.gitignore` file includes rules that should instruct your Git client to ignore these directories when you're checking in code.

### App config files

*TODO: Describe `imgix.config.js` file that handles app-specific options and settings.*

### Available PostCSS plugins

We're using the following PostCSS plugins to enhance our written CSS:

* [`postcss-import`](https://github.com/postcss/postcss-import) to allow for inline importing of files with the `@import` keyword
* [`postcss-mixins`](https://github.com/postcss/postcss-mixins) for Sass-like `mixin` functions
* [`postcss-nested`](https://github.com/postcss/postcss-nested) to allow nested rules
* [`postcss-simple-vars`](https://github.com/postcss/postcss-simple-vars) for Sass-like variables
* [`postcss-calc`](https://github.com/postcss/postcss-calc) to optimize `calc()` references when possible
* [`lost`](https://github.com/corysimmons/lost) for easy and flexible grids
* [`postcss-each`](https://github.com/outpunk/postcss-each) and [`postcss-for`](https://github.com/antyakushev/postcss-for) for `@each` and `@for` loops, respectively
* [`postcss-color-function`](https://github.com/postcss/postcss-color-function) for CSS4 `color()` operations
* [`postcss-selector-matches`](https://github.com/postcss/postcss-selector-matches) and [`postcss-selector-not`](https://github.com/postcss/postcss-selector-not) to allow `:matches()` and `:not()`pseudo-selectors
* [`postcss-easings`](https://github.com/postcss/postcss-easings) as a shortcut for nicely named easing functions, like `easeInOutQuad`
* [`postcss-clearfix`](https://github.com/seaneking/postcss-clearfix) to provide a single-line `clear: fix` definition
* [`postcss-fakeid`](https://github.com/pathsofdesign/postcss-fakeid) to automatically transform `#foo` into `[id='foo']`
* [`autoprefixer`](https://github.com/postcss/autoprefixer) to automatically add vendor prefixes as needed
* [`postcss-pseudoelements`](https://github.com/axa-ch/postcss-pseudoelements) to fix `::`-style pseudo-selectors for older browsers
* [`postcss-color-rgba-fallback`](https://github.com/postcss/postcss-color-rgba-fallback) to provide automatic fallbacks for `rgba()` colors in older browsers

## Unit tests

*TODO: Write this part*

### Writing unit tests

*TODO: Write this part*

### Running unit tests

*TODO: Write this part*

## Integration Tests

*TODO: Write this part*

### Writing integration tests

*TODO: Write this part*

### Running integration tests

Run `gulp test-app-integration --app=styleguide` to launch webdrivers and run integration tests for the Styleguide app (currently the only app with integration tests written). If everything is installed correctly, this should take about 30 seconds. The current tests compare screenshots taken from Firefox at a handful of different viewport widths and compares them to reference shots found at `/styleguide/test/[component]/screens-baseline`. If any of the tests fail (because the component being tested has changed in some way), two new directories will be created and populated with .pngs:

* `/styleguide/test/[component]/screens-[timestamp]/` will contain screenshots of the "offending" areas, as they were captured during the integration test.
* `/styleguide/test/[component]/screens-[timestamp]-diffs/` will contain comparisons of the baseline and regression images, with differences highlighted with magenta pixels.

If the "regression" image represents an intended change, simply replace the baseline image of the corresponding name with the "regression" image and delete the diff image. Baseline images should be checked into repo so we don't need to rely on each developer contributing to this repo to generate their own baseline shots. There are rules in `.gitignore` to ensure that regression and diff images can't be checked into the repo by accident.


## Code-analysis

This repository also defines a set of code-analysis tools (linters) that should be used by all imgix web-projects to check code for correctness, consistency, and quality. These tools run during the build process and will alert you if you've written code that violates one of the linter's defined code-quality rules. These rules are defined by the `rc.*.json` ("run command") files in the `runcoms` directory.

- **[JSHint](http://jshint.com/)** is used to identify errors or potential gotchas in JavaScript code, such as ensuring that curly braces are not skipped, or that the strict equality operator is always used. The list of JSHint rules enforced in this repo can be found in [`rc.jshint.json`](./runcoms/rc.jshint.json).
- **[JSCS](http://jscs.info/)** is used to enforce code-style rules for JavaScript files, such as ensuring proper line indentation and spacing between tokens. The list of JSCS rules enforced in this repo can be found in [`rc.jscs.json`](./runcoms/rc.jscs.json).
- **[stylelint](http://stylelint.io/)** is used to identify potential gotchas and enforce code-style rules for CSS files, such as ensuring proper line indentation and preventing excessive nesting. The list of stylelint rules enforced in this repo can be found in [`rc.stylelint.json`](./runcoms/rc.stylelint.json).
- **[HTMLHint](http://htmlhint.com/)** is used to enforce code-style rules and ensure consistency in HTML files (including `.tmpl` template files), such as checking for unclosed tags and unsafe characters in attributes. The list of HTMLHint rules enforced in this repo can be found in [`rc.htmlhint.json`](./runcoms/rc.hmlthint.json).

Very few of the rules enforced by these linters are considered to be set in stone. If you find the rules to be unnecessarily restrictive (or not restrictive enough) in some way, they can be adjusted over time. However, it's important that all imgix-authored front-end code be subject to these rules—if we don't follow the rules we set for ourselves, we might as well not have any rules at all.

