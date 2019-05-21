// Define the necessary modules.
const {prompt} = require('inquirer');
const {request} = require('../api');
const {success, warning, fail} = require('../console');
const {store, isAuthBefore} = require('../store');

// Define the "Auth" prompt.
const authPrompt = [
  {
    type: 'input',
    name: 'email',
    message: 'Email:',
    validate: function(value) {
      return !!value.length;
    },
  },
  {
    type: 'password',
    name: 'password',
    message: 'Password:',
    validate: function(value) {
      return !!value.length;
    },
  },
];

// Define the "Already auth before" prompt.
const alreadyAuthBeforePrompt = [
  {
    type: 'confirm',
    name: 'continue',
    default: false,
    message: 'Do you want to continue?',
  },
];

/**
 * @return {void}
 */
const authAction = () => {
  const authPromptHandler = () => {
    prompt(authPrompt).then(answers => {
      authRequest(answers);
    });
  };

  if (isAuthBefore()) {
    warning('You are already authorized for using the Codario CLI tool. If you continue, current credentials will get lost.');

    prompt(alreadyAuthBeforePrompt).then(answers => {
      if (answers.continue) {
        authPromptHandler();
      }
    });
  } else {
    authPromptHandler();
  }
};

/**
 * @param {object} data: contains {email, password} properties.
 *
 * @return {string}
 */
const authRequest = (data) => {
  request('login/check', 'POST', {_username: data.email, _password: data.password}, false).handler(body => {
    body.email = data.email;
    store.set(body);

    success(` You are authorized now to use the Codario CLI tool. Your credentials have been stored in "~/.config/codario". Keep this data by yourself!`);
  }).catch(err => {
    if (401 !== err.statusCode) {
      return;
    }

    fail(`The email or password that you have entered is incorrect.`);
  }).done();
};

module.exports = {
  authAction,
};
