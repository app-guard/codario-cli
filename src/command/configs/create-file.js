// Define the necessary modules.
const {prompt} = require('inquirer');
const fs = require('fs');
const {success, warning, fail} = require('../../console');
const {isAuthBefore, store} = require('../../store');
const bestPractices = require('./best-practices');

// Define the config file name.
const configFileName = '.appguard.json';

// Define the "Create prompt" prompt.
const configFileAlreadyExistsPrompt = [
  {
    type: 'confirm',
    name: 'continue',
    default: false,
    message: 'Do you want to continue?',
  },
];

/**
 * @param {string} dir
 *
 * @return {void}
 */
const createConfigFileAction = (dir = '') => {
  if (!isAuthBefore()) {
    fail('You need to be authorized for this action. Execute "codario auth" to continue.');
    return;
  }

  fs.access(dir + configFileName, fs.constants.F_OK, (err) => {
    if (!err) {
      warning('The JSON-config file already exists in this folder. If you will continue, the current file will be overridden.');

      prompt(configFileAlreadyExistsPrompt).then(answers => {
        if (answers.continue) {
          createConfigFile(dir);
        }
      });
    } else {
      createConfigFile(dir);
    }
  });
};

/**
 * @param {string} dir
 *
 * @return {void}
 */
const createConfigFile = (dir = '') => {
  const email = store.get('email');
  let configs = JSON.stringify(bestPractices, null, 2);

  configs = configs.replace(/\[email\]/, email);

  fs.writeFile(dir + configFileName, configs, (err) => {
    if (err) {
      fail(err.message);
      return;
    }

    success('The JSON-config file ".appguard.json" has been created.');
    warning('Remember that you need to commit and push this file to your "main branch" and after this JSON-config file will be imported automatically to the corresponding Codario project.');
  });
};

module.exports = {
  createConfigFileAction,
};
