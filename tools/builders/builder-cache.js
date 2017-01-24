module.exports = {
  js: function proxyBuildJS() {
      return require('./builders/builder.js.js').apply(null, arguments);
    },
  css: function proxyBuildCSS() {
      return require('./builders/builder.css.js').apply(null, arguments);
    },
  svg: function proxyBuildSVG() {
      return require('./builders/builder.svg.js').apply(null, arguments);
    },
  html: function proxyBuildHTML() {
      return require('./builders/builder.html.js').apply(null, arguments);
    }
};
