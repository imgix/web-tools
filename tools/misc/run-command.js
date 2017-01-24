var exec = require('child_process').exec,
    Q = require('q');

module.exports = function runCommand(command, options) {
  var child,
      dfd = Q.defer();

  child = exec(command, options, function callback(error, stdout, stderr) {
    if (error) {
      error.stdout = stdout;
      error.stderr = stderr;
      error.message = 'Error running command: `' + command + '`.';

      dfd.reject(error);
    } else {
      dfd.resolve(stdout);
    }
  });

  child.stderr.pipe(process.stderr);

  return dfd.promise;
};
