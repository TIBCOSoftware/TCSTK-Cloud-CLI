import arg from 'arg';
var gulp = require('gulp');
require('./gulpfile');

function parseArgumentsIntoOptions(rawArgs) {
    const args = arg(
        {
            '--debug': Boolean,
            '-d': '--debug'
        },
        {
            argv: rawArgs.slice(2),
        }
    );
    return {
        debug: args['--debug'] || false,
        task: args._[0]
    };
}

// const runGulpTask = require('run-gulp-task');
// Main function
export function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    // console.log(options);
    // gulp.start('default');
    // gulp.series('default').;
    // TODO: Change this to pass the commandline option
    require('gulp-cli')();
    // runGulpTask('test', 'gulpfile.js'); Does not work...

}
