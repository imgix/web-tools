module.exports = {
  js: function proxyBuildJS() {
      return require('./build-js.js').apply(null, arguments);
    },
  templates: function proxyBuildTemplates() {
      return require('./build-templates.js').apply(null, arguments);
    },
  css: function proxyBuildCSS() {
      return require('./build-css.js').apply(null, arguments);
    },
  svg: function proxyBuildSVG() {
      return require('./build-svg.js').apply(null, arguments);
    },
  partials: function proxyBuildPartials() {
      return require('./build-html.js').apply(null, arguments);
    },
  html: function proxyBuildHTML() {
      return require('./build-html.js').apply(null, arguments);
    }
};
