var _ = require('lodash'),
    chalk = require('chalk'),
    changeCase = require('change-case'),
    Table = require('easy-table'),
    logSymbols = require('log-symbols');

module.exports = function setUp(gulp) {
  var taskMetadata = {},
      longestName = 0;

  return {
    addTask: function(name, metadata) {
        metadata.name = name;

        if (name.length > longestName) {
          longestName = name.length;
        }

        taskMetadata[name] = metadata;
      },
    describeAll: function() {
        var output = '',
            groupedTasks;

        function makeSection(table, task) {
          var descriptionLines =
          table.cell(0, task.name, function printName(name, width) {
              if (width) {
                return chalk.cyan(name);
              } else {
                // Gotta pad with a real character here to fake the width during measurement
                return _.padRight(name, longestName, '-');
              }
              return ;
            });

          table.cell(1, task.description, _.ary(chalk.grey, 1));

          _.each(task.arguments, function makeArgumentRow(argDescription, argName) {
            table.newRow();
            table.cell(0, '  --' + argName + '=[...]', _.ary(chalk.cyan, 1));
            table.cell(1, argDescription, _.ary(chalk.dim, 1));
          });

          _.each(task.notes, function makeNoteRow(note) {
            var note = '  ' + logSymbols.warning + ' ' + note;

            table.newRow();
            table.cell(0, '');
            table.cell(1, note, _.ary(chalk.yellow, 1));
          });

          table.newRow();
        }

        function makeHeader(category) {
          var base = '-- ' + changeCase.title(category) + ' Tasks ',
              padLength = 40;

          return chalk.blue(_.padRight(base, padLength, '-'));
        }

        groupedTasks = _.groupBy(taskMetadata, 'category');

        // In each cagtegory, sort by weight
        _.each(groupedTasks, function(tasks, category) {
          var sortedTasks,
              table = new Table();

          sortedTasks = _.sortBy(tasks, function sortTask(task) {
            if (_.isNumber(task.weight)) {
              return task.weight;
            } else {
              return 9999;
            }
          });

          _.each(sortedTasks, _.partial(makeSection, table));

          output += makeHeader(category) + '\n';
          output += table.print() + '\n';
        });

        return output;
      }
  };
}
