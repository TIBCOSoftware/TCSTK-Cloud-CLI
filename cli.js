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

// Main function
export function cli(args) {
    let options = parseArgumentsIntoOptions(args);
    console.log(options);
    // gulp.start('default');
    // gulp.series('default').;
    require('gulp-cli')();
}
