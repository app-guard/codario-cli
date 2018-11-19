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
    message: 'Email',
    validate: function(value) {
      return !!value.length;
    },
  },
  {
    type: 'password',
    name: 'password',
    message: 'Password',
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
    prompt(authPrompt).then(answers =>
        authRequest(answers),
    );
  };

  if (isAuthBefore()) {
    warning('You are already authorized in App Guard. If you will continue - current credentials will be lost.');

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
 * @param {Object} data: contains {email, password} properties.
 *
 * @return {string}
 */
const authRequest = (data) => {
  request('login/check', 'POST', {_username: data.email, _password: data.password}, false).handler(body => {
    body.email = data.email;
    store.set(body);

    success(`You are authorized successfully. Your credentials have been stored in "~/.config/codario". Don't share this data with anyone else!`);
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
