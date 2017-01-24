var _ = require('lodash'),
    Q = require('q'),
    runCommand = require('./misc/run-command.js');

module.exports = function chromeLoad(url) {
  // Check to see if the chrome-cli command exists
  return runCommand('command -v chrome-cli')
    .catch(function throwError(error) {
        return error;
      })

    // List all tabs
    .then(_.partial(runCommand, 'chrome-cli list links', {encoding: 'utf8'}))

    // Filter to tabs matching this URL
    .then(function filterTabs(tabList) {
        var urlRegex = new RegExp(url.replace('/', '\\/')),
            tabRegex = /\[(\d+):(\d+)\]\s/,
            tabIDs;

        tabIDs = _.chain(tabList.split('\n'))
          .map(function reloadTab(tabInfo) {
              if (urlRegex.test(tabInfo)) {
                // [0] is full match, [1] is window id, [2] is tab id
                return tabRegex.exec(tabInfo)[2];
              } else {
                return null;
              }
            })
          .compact()
          .value();

        if (tabIDs.length) {
          return tabIDs;
        } else {
          return Q.reject();
        }
      })

    // If there are tabs, reload them. Otherwise, open a new one
    .then(
        function reloadTabs(matchingTabIDs) {
            return Q.all(_.map(matchingTabIDs, function reloadTabByID(tabID) {
              return runCommand('chrome-cli reload -t ' + tabID);
            }));
          },
        function openNewTab() {
            return runCommand('chrome-cli open ' + url);
          }
      );
};
