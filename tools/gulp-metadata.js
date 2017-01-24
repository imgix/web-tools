var _ = require('lodash'),
    chalk = require('chalk'),
    changeCase = require('change-case'),
    Table = require('easy-table'),
    logSymbols = require('log-symbols');

module.exports = {
  applyTo: function (gulp) {
      var originalTaskFunc;

      if (!gulp.metadata) {
        gulp.metadata = {
          store: {},
          longestName: 0,
          add: function (name, metadata) {
              metadata.name = name;

              if (name.length > gulp.metadata.longestName) {
                gulp.metadata.longestName = name.length;
              }

              gulp.metadata.store[name] = metadata;
            },
          describeAll: function () {
              var tables = {},
                  output = '',
                  groupedTasks;

              function makeSection(table, task) {
                var descriptionLines =
                table.cell(0, task.name, function printName(name, width) {
                    if (width) {
                      return chalk.cyan(name);
                    } else {
                      // Gotta pad with a real character here to fake the width during measurement
                      return _.padEnd(name, gulp.metadata.longestName, '-');
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
                  var noteLine = '  ' + logSymbols.warning + ' ' + note;

                  table.newRow();
                  table.cell(0, '');
                  table.cell(1, noteLine, _.ary(chalk.yellow, 1));
                });

                table.newRow();
              }

              function makeHeader(category) {
                var base = '-- ' + changeCase.title(category) + ' Tasks ',
                    padLength = 40;

                return chalk.blue(_.padEnd(base, padLength, '-'));
              }

              groupedTasks = _.groupBy(gulp.metadata.store, 'category');

              // In each cagtegory, sort by weight
              _.each(groupedTasks, function categoryLoop(tasks, category) {
                var sortedTasks,
                    table = new Table();

                sortedTasks = _.sortBy(tasks, function sortTask(task) {
                  if (_.isNumber(task.weight)) {
                    return task.weight * -1;
                  } else {
                    return -9999;
                  }
                });

                _.each(sortedTasks, _.partial(makeSection, table));

                tables[category] = table;
              });

              if (tables.main) {
                output += '\n' + makeHeader('main') + '\n' + tables.main.print() + '\n';
              }

              return _.reduce(tables, function makeOutput(output, table, category) {
                if (category !== 'main') {
                  output += makeHeader(category) + '\n' + table.print() + '\n';
                }

                return output;
              }, output);
            }
        };

        // Rewrite gulp.task function to accept metadata
        originalTaskFunc = gulp.task;
        gulp.task = function () {
          var metadata = _.last(arguments);

          if (_.isObject(metadata)) {
            originalTaskFunc.apply(this, _.initial(arguments));
            gulp.metadata.add(_.first(arguments), metadata);
          } else {
            originalTaskFunc.apply(this, arguments);
          }
        };
      }

      return gulp;
    }
};
