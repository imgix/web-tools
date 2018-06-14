var _ = require('lodash'),
    Q = require('q'),
    runCommand = require('./run-command.js');

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
        var tabIDs = _.chain(tabList.split('\n'))
          .map(function reloadTab(tabInfo) {
              var urlRegex = new RegExp('^\[(\d+:?\d*)\]\s' + url.replace('/', '\\/')),
                  result = urlRegex.test(tabInfo);

              if (!!result && result.length) {
                // [0] is full match, [1] is window & tab id
                return _.chain(result)
                  .get('[1]')
                  .split(':')
                  .last()
                  .value();
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
