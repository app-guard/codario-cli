// Define the necessary modules.
const colors = require('colors/safe');

/**
 * @param {string} message.
 *
 * @return {void}
 */
const fail = (message) => {
  console.log(colors.red(message));
};

/**
 * @param {string} message.
 *
 * @return {void}
 */
const success = (message) => {
  console.log(colors.green(message));
};

/**
 * @param {string} message.
 *
 * @return {void}
 */
const warning = (message) => {
  console.log(colors.yellow(message));
};

module.exports = {
  success,
  fail,
  warning,
};
