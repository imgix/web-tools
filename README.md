# web-tools

**web-tools** is a repo for imgix's common front-end tooling, including test, server, and build systems.


## Overview

This repo manages a suite of common development tools for all imgix web projects, including tools to develop, lint, test, compile, and deploy code. By using this set of common tools and organizational paradigms across multiple projects, we reduce the cognitive load involved in starting a new project, or picking up development on an unfamiliar existing project.


### Project structure

- The [`tools`](./tools) directory contains a set of tools intended to be used as a part of a web application's development and build process. The most important tool is [`gulp-tasks.js`](./tools/gulp-tasks.js), which provides a set of common Gulp tasks that bring together all of the other tools into a set of simple, sensible commands.
- The [`runcoms`](./runcoms) directory contains rulesets for various linters and code-quality tools. For more information, see [Code Analysis](#code-analysis) below.
- The [`examples`](./examples) directory contains a set of template files that web projects can copy and tweak in order to set up their tools.

*Note: The `/node_modules` directory is not a part of this project's code and therefore should never be checked in to the repo. Instead, each developer will create and populate this directory on their local machine by running `npm install` after cloning the repo. This ensures that the repo isn't cluttered up by files unrelated to the project, and makes it easier to upgrade dependencies if need be. The repo's `.gitignore` file includes rules that should instruct your Git client to ignore these directories when you're checking in code.*


## Integrating `web-tools` into a project

The tools in this project are designed to be used with [**gulp.js**](http://gulpjs.com/), a command-line task runner built on Node. You'll need to set up a simple gulpfile for your project, import gulp tasks from this project, and create a configuration file telling these gulp tasks how to behave.


### Global installs

Before you can integrate `web-tools` into your project, you need to ensure that the following software is installed globally on your machine. These pieces should be installed roughly in this order, but you may skip a step if you already have the given component on your machine.

1. **Download and install Homebrew** by following the instructions on [brew.sh](http://brew.sh/).
* **Run `brew install node`** to install [Node](https://nodejs.org/en/) via Homebrew. Node is required to run all of the things in this repo.
* **Run `sudo npm install npm -g`** to update Node's package manager, [NPM](npmjs.com). NPM comes bundled with Node, but this will make sure it's up to date.
* **Run `npm install -g gulp`** to install [Gulp](http://gulpjs.com/) via NPM. Gulp is a task-runner that our tools rely on.
* **Run `npm install -g bower`** to install [Bower](http://bower.io/) via NPM. Bower is a client-side package manager that your project should use.
* **Run `npm install -g selenium-standalone`** to install a package from NPM that includes [Selenium](http://www.seleniumhq.org/) and its associated webdrivers. Selenium is needed to run integration tests.
* **Install the Java Runtime**. This is necessary to run Selenium properly. The easiest way to accomplish this is with the Brew/Cask instructions found [here](http://stackoverflow.com/a/28635465/506330).
* **Run `brew install graphicsmagick`** to install the [GraphicsMagick](http://www.graphicsmagick.org/) package that helps [Eyeball.js](#eyeball-js) save and crop screenshots.
* **Run `brew install chrome-cli`** to install the [chrome-cli](https://github.com/prasmussen/chrome-cli) client that allows us to examine and manipulate Chrome tabs on your machine, for auto-reloading.

You can read more about these technologies and how `web-tools` interacts with them in the [Technologies](#technologies) section below.


### Getting Started with `web-tools`

The tools provided by this repo are intended to be included in dependent projects via [NPM](https://www.npmjs.com/). This project's NPM Package is not listed publicly. To include these tools in a new project:

1. **Initialize NPM** for that project by running `npm init` in the new project's root directory, then follow the prompts. This creates a `package.json` file for your project, to which you can add a list of development dependencies.
* While it's not strictly required (since it should be [installed globally](#installing-global-dependencies)), you should also run `npm install --save-dev gulp` to note in your project's `package.json` file that gulp is also a dependency of this project. This will make it easier for someone reading your `package.json` to understand how your project is set up.
* **Run `npm install --save-dev git+ssh://git@github.com/zebrafishlabs/web-tools.git@X.Y.Z`** to add `web-tools` as a dependency for your project.  Be sure to change the `@X.Y.Z` in the command above to instead point to the [latest stable version](releases/latest) of these tools. *Note: This command will fail if your machine is not properly credentialed to access Zebrafish git repos.*

Now that the tools are included, you'll want to integrate them into your project's build system. The basic setup involves a `gulpfile.js` in your repo, and a configuration file (commonly named `imgix.config.js`, but the name doesn't matter).

To **set up your `gulpfile.js`**, copy the example file at ([`examples/gulpfile.js`](./examples/gulpfile.js)) to your project's root directory. This file will work as-is, but if your configuration file is set-up in a non-standard way, or if your project requires additional gulp tasks, you may need to edit it.

Next, **create a config file** to configure how your project will interact with these tools. The best way to do this is by copying the `examples/imgix.config.js` file (or a config file from another repo) into your project's root directory and changing the values to suit your needs. For more details about this configuration file, see [Configuring web-tools](#configuring-web-tools) below.


### Configuring `web-tools`

*TODO: Describe `imgix.config.js` file that handles app-specific options and settings.*


### Using the gulp tasks

The gulp tasks defined by these tools fall into five major categories:

#### The default (`gulp`)

The default gulp task, executed by simply running `gulp`, is the most useful task available for developing your repo. For common development situations, this is the only task you should need to run.

For a project with a standard configuration, the default task will [**build**](#building-gulp-build) your project, [**serve**](#serving-gulp-serve) it from a new local webserver, and [**watch**](#watching-gulp-watch) it for changes. You can learn more about these specific tasks below.

#### Building (`gulp build`)

To build the assets for your app, run **`gulp build`**. This task runs a dozen or so sub-tasks in the background, one for each asset-type you've defined in the `appAssets` and `extAssets` hashes in your [config file](#configuring-web-tools) (i.e., `build-app-js` or `build-ext-css`).

The build tasks will [check](#appendix-code-analysis), compile, concatenate, rename, and otherwise manipulate your app's assets into a state where they're ready to be served, and then place them in a temporary "destination directory". In some cases, such as the build task for CSS, the process is very complicated. In other cases, such as the build task for a set of font files, the process simply relocates the source files to the destination directory.

**In most cases**, the destination directory is something like `.dev_srv`, and is intended to be examined or served locally only–it should not be checked in to your app's repository. This directory is defined by the `dest` property of each item in your `appAssets` or `extAssets` hashes.

#### Serving (`gulp serve`)

The **`gulp serve`** task will spin up a lightweight, local webserver, serving files out of the destination directory of the build tasks. The properties of this server are dependent on the `server` object you've defined in your [config file](#configuring-web-tools). If you have [chrome-cli](https://github.com/prasmussen/chrome-cli) installed on your machine (`brew install chrome-cli`), this task will also automatically reload any open tabs currently pointing to the localhost address for your app, or open a new tab for you.

Once a server has been started, it will continue running until you kill the process (`ctrl+c`) or run `gulp serve-stop`.

*Note: if your project does not define a `server` object in its config file, no serve tasks will be available.*

#### Watching (`gulp watch`)

To watch your assets and automatically rebuild them whenever a change is made, run `gulp watch`. This will watch both "local" assets, as well as external assets (by watching your project's `bower_components` directory), based on what you've defined in the `appAssets` and `extAssets` hashes in your [config file](#configuring-web-tools).

When an asset is changed, build tasks are automatically queued for the asset in question, as well as any assets that depend on it. If you're currently running a server, the `serve-load` task will also be queued to reload any open Chrome tabs currently pointing to your app's localhost address.

#### Testing (`gulp test`)

The **`gulp test`** command runs all of the tests currently configured on your project.

If your config file has a `unitTests` hash, the `gulp test-unit` task will be available. This task runs your unit test files (defined as a glob in `unitTests.src` in your config) in the browser of your choice (defaults to PhantomJS) with [Karma runner](#karma).

If your config file has a `integrationTests` hash, the `gulp test-integration` task will be available. This task runs your integration test specs (defined as a glob in `integrationTests.src` in your config), using [WebdriverIO](#webdriverio). Integration test specs can also make use of [Eyeball.js](#eyeball-js) to run visual-regression checks on your app, to spot unintended visual changes. Read more about how this system works in the ["Eyeball.js" section](#eyeball-js) below.

Running `gulp test` will run both of these tasks in parallel, if they're both available. Additionally if you set the `--match` flag when running one of these test tasks, the source files being tested will be filtered to only run files that match the string you've provided. For example: `gulp test --match=sign_in`.

#### `gulp help`

You can run `gulp help` to get a complete, annotated listing of all available gulp tasks.


## Technologies

The tools in this repository are built on the following technologies:

#### [Node Package Manager](https://npmjs.com) (NPM)

This repo uses **NPM** to manage its own dependencies (listed under `dependencies` in [`package.json`](./package.json). To develop this repo, you'll need to install these dependencies locally by running `npm install` in the root directory after you've cloned the repository.

`web-tools` also uses NPM to define itself as a dependency for other repos. [Dependent projects](#appendix-dependent-projects) can define this repo as a dependency in their own `package.json` files, and use NPM's built-in version resolution to ensure that they're always using a known, stable version of these tools.

#### [gulp.js](https://gulpjs.com)

The tools in this project are designed to be used with **gulp.js**, a command-line task runner built on Node. A typical gulp task reads and manipulates a set of files by passing around streams of files using a system called [Vinyl](https://github.com/gulpjs/vinyl). Gulp is designed to combine its tasks with maximum concurrency.

If you have gulp installed globally on your machine (`npm install -g gulp`), you can execute gulp tasks as defined in the project's `gulpfile.js` by running the `gulp` command followed by the task name: `gulp build`. You can specify additional variables as normal command-line flags: `--key=value`.

#### [**Express**](http://expressjs.com/)

**Express** is a simple webserver for Node. While not ideal for our production environment, Express serves just fine for serving a static website during development, so it's baked into this toolkit.

#### [**Jasmine**](http://jasmine.github.io/)

The testing tools in this project are built on top of **Jasmine**. Jasmine is a framework for specifying expectations for the behavior of code, and is suitable for writing both unit tests and integration tests.

#### [**Karma**](https://karma-runner.github.io)

This project uses **Karma** as the backbone for its unit-testing tool. Unit tests test individual pieces of code at minimum granularity and maximum specificity. Karma runs these tests in [PhantomJS](http://phantomjs.org/), in a simulated version of a webpage.

#### [**WebdriverIO**](http://webdriver.io/)

This project uses **WebdriverIO** to drive its integration-testing tool. Integration tests test complete application code by requesting a real version of the application from a local server and controlling a real browser using [Selenium Standalone](http://www.seleniumhq.org/). Webdriver also allows us to run **visual regression tests** (VRTs), wherein we compare screenshots of the application in its current state to screenshots of the application from a known stable state to help us spot unexpected visual changes. The VRTs are driven by a tool called [Eyeball.js](./tools/eyeball.js).

#### [**Eyeball.js**](./tools/eyeball.js)

Eyeball.js is a home-grown tool for running visual regression tests. When called from inside of a test specification, Eyeball will take a screenshot of a specific element on the page and save it to a specified directory as a "baseline" image for later use.

To use Eyeball.js, just call `browser.checkRendering()` from within your test spec, passing in an id for your test suite, a list of selectors representing the elements on the page you'd like to screenshot, and a list of viewport widths you'd like the screenshots to be taken at. An example VRT specification is available at [`examples/spec.visual_regression.js`](./examples/spec.visual_regression.js).

If Eyeball.js encounters a pre-existing baseline image for a given test, the new screenshot will be compared to the baseline and analyzed for differences with a script called [Resemble.js](https://www.npmjs.com/package/node-resemble-js). If this analysis reveals that the element in question has strayed from its baseline by a significant margin, the new screenshot will be moved to a separate folder for manual review and a second image will be saved with the differences between the new screenshot and its baseline highlighted with magenta pixels.

If you review the "regression" image and find that it represents an intended change, simply replace the baseline image of the corresponding name with the "regression" image and delete the diff image. Baseline images should be checked into the project's repo. There are rules in [`.gitignore`](./.gitignore) to ensure that regression and diff images can't be checked into the repo by accident.


## Appendix: Dependent Projects

The following projects depend on `web-tools`:

* **[`web-shared`](https://github.com/zebrafishlabs/web-shared)**: Shared components and CSS for imgix web properties
* **[`web-styleguide`](https://github.com/zebrafishlabs/web-styleguide)**: An app for demonstrating and testing imgix UI components
* **[`web-dashboard`](https://github.com/zebrafishlabs/web-dashboard)**: An app for customers to interact with their imgix account


## Appendix: Code-analysis

This repository defines a set of code-analysis tools (linters) that should be used by all imgix web-projects to check code for correctness, consistency, and quality. These tools run during the build process and will alert you if you've written code that violates one of the linter's defined code-quality rules. These rules are defined by the `rc.*.json` ("run command") files in the `runcoms` directory.

- **[JSHint](http://jshint.com/)** is used to identify errors or potential gotchas in JavaScript code, such as ensuring that curly braces are not skipped, or that the strict equality operator is always used. The list of JSHint rules enforced in this repo can be found in [`rc.jshint.json`](./runcoms/rc.jshint.json).
- **[JSCS](http://jscs.info/)** is used to enforce code-style rules for JavaScript files, such as ensuring proper line indentation and spacing between tokens. The list of JSCS rules enforced in this repo can be found in [`rc.jscs.json`](./runcoms/rc.jscs.json).
- **[stylelint](http://stylelint.io/)** is used to identify potential gotchas and enforce code-style rules for CSS files, such as ensuring proper line indentation and preventing excessive nesting. The list of stylelint rules enforced in this repo can be found in [`rc.stylelint.json`](./runcoms/rc.stylelint.json).
- **[HTMLHint](http://htmlhint.com/)** is used to enforce code-style rules and ensure consistency in HTML files (including `.tmpl` template files), such as checking for unclosed tags and unsafe characters in attributes. The list of HTMLHint rules enforced in this repo can be found in [`rc.htmlhint.json`](./runcoms/rc.hmlthint.json).

Very few of the rules enforced by these linters are considered to be set in stone. If you find the rules to be unnecessarily restrictive (or not restrictive enough) in some way, they can be adjusted over time. However, it's important that all imgix-authored front-end code be subject to these rules—if we don't follow the rules we set for ourselves, we might as well not have any rules at all.


## Appendix: Available PostCSS plugins

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
