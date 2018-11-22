// Define the necessary modules.
const os = require('os');
const Store = require('data-store');

// Define the store service.
const store = new Store({path: os.homedir() + '/.config/codario/auth.json'});

/**
 * @return {boolean}
 */
const isAuthBefore = () => {
  return store.has('token') && store.has('refresh_token') && store.has('email');
};

module.exports = {
  store,
  isAuthBefore,
};
