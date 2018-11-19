// Define the necessary modules.
const program = require('commander');
const { authAction } = require('./src/command/auth');
const { createConfigFileAction } = require('./src/command/configs/create-file');
const { createProjectAction } = require('./src/command/project/create');

program
  .version('1.0.0')
  .description('AppGuard - Update automation for open source libraries.');

program
  .command('auth')
  .alias('a')
  .description('Authorize with your account.')
  .action(authAction);

program
  .command('project:create')
  .alias('pc')
  .description('Create a new project.')
  .action(createProjectAction);

program
  .command('configs:create-file')
  .alias('ccf')
  .description('Create a config file.')
  .action(createConfigFileAction);

program
  .on('command:*', function () {
    console.error('Invalid command: %s\nSee --help for a list of available commands.', program.args.join(' '));
    process.exit(1);
  });

if (2 === process.argv.length) {
  process.argv.push('--help');
}

program.parse(process.argv);