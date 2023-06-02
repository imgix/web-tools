var _ = require('lodash'),
    Q = require('q'),
    runCommand = require('./run-command.js');

module.exports = function chromeLoad(url) {
  // Check to see if the chrome-cli command exists
  return runCommand('command -v chrome-cli')
    .catch(function throwError(error) {
      return error;
    })

    // List all tabs in json format
    .then(_.partial(runCommand, 'OUTPUT_FORMAT=json chrome-cli list links', {encoding: 'utf8'}))

    // Filter to tabs matching this URL
    .then(function filterTabs(tabList) {
      const tabIDs = _.chain(JSON.parse(tabList).tabs)
        .map(function reloadTab(tabInfo) {
            const isLocalhost = tabInfo.url.includes('localhost');

            if (isLocalhost) {
              return tabInfo.id;
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
          // Newer chrome returns negative numbers for ids so we need to check if id is negative
          if (tabID > 0) {
            return runCommand('chrome-cli reload -t ' + tabID);
          } else {
            return runCommand('chrome-cli reload');
          }
        }));
      },
      function openNewTab() {
        return runCommand('chrome-cli open ' + url);
      }
    );
};
