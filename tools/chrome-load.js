var _ = require('lodash'),
    exec = require('exec');

module.exports = function chromeLoad(url) {
  var exec = require('child_process').execSync,
      urlRegex,
      tabRegex,
      tabList,
      matchingTabs = 0;

  // Check to see if the chrome-cli command exists
  if (exec('command -v chrome-cli')) {
    urlRegex = new RegExp(url.replace('/', '\\/'));
    tabRegex = /\[(\d+):(\d+)\]\s/;
    tabList = exec('chrome-cli list links', {encoding: 'utf8'}).split('\n');

    _.each(tabList, function reloadTab(tabInfo) {
      if (urlRegex.test(tabInfo)) {
        // [0] is full match, [1] is window id, [2] is tab id
        exec('chrome-cli reload -t ' + tabRegex.exec(tabInfo)[2]);
        matchingTabs++;
      }
    });

    if (!matchingTabs) {
      exec('chrome-cli open ' + url);
    }
  }
};
