module.exports = {
  js: function proxyBuildJS() {
      return require('./builder.js.js').apply(null, arguments);
    },
  css: function proxyBuildCSS() {
      return require('./builder.css.js').apply(null, arguments);
    },
  svg: function proxyBuildSVG() {
      return require('./builder.svg.js').apply(null, arguments);
    },
  html: function proxyBuildHTML() {
      return require('./builder.html.js').apply(null, arguments);
    }
};
