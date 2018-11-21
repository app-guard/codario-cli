// Define the necessary modules.
const rp = require('request-promise');
const {fail} = require('./console');
const {store} = require('./store');
const jwtDecode = require('jwt-decode');

// Define API path.
const basepath = 'https://api.app-guard.io/api/';

/**
 * @param {string} path
 * @param {string} method
 * @param {object} body
 * @param {boolean} withToken
 *
 * @return {object}
 */
const request = (path, method, body = {}, withToken = true) => {
  const options = {
    uri: basepath + path,
    method: method,
    json: true,
    timeout: 300000,
    headers: {},
  };

  if (Object.keys(body).length) {
    options.body = body;
  }

  const response = () => {
    let thenFns = [];
    let catchFns = [];
    let promise;

    const token = getToken();

    if (!token && withToken) {
      requestToken(options, thenFns, catchFns);
    } else {
      options.headers = {
        Authorization: 'Bearer ' + token,
      };

      promise = rp(options);
    }

    const response = {
      handler: (fn) => {
        thenFns.push(fn);
        return response;
      },
      catch: (fn) => {
        catchFns.push(fn);
        return response;
      },
      done: () => {
        if (promise) {
          processRequest(promise, thenFns, catchFns);
        }
      },
    };

    return response;
  };

  return response();
};

/**
 * @return {string|null}
 */
const getToken = () => {
  if (!store.has('token')) {
    return null;
  }

  /**
   * @type {string} token
   */
  const token = store.get('token');

  const data = jwtDecode(token);
  const now = Date.now() / 1000 | 0;

  if (now < data.exp - 100) {
    return token;
  }

  return null;
};

/**
 * @param {object} options
 * @param {array} thenFns
 * @param {array} catchFns
 *
 * @return {void}
 */
const requestToken = (options, thenFns, catchFns) => {
  const _options = {
    uri: basepath + 'token/refresh',
    method: 'POST',
    json: true,
    timeout: 30000,
    formData: {
      refresh_token: store.get('refresh_token'),
    },
  };

  rp(_options).then(body => {
    if (body.token) {
      store.set('token', body.token);
    }

    options.headers = {
      Authorization: 'Bearer ' + body.token,
    };

    const promise = rp(options);
    processRequest(promise, thenFns, catchFns);
  }).catch(() => {
    store.clear();

    fail(`Unable to update your access token. Please authorize again using "codario auth".`);
  });
};

/**
 * @param {Promise} promise
 *
 * @return {void}
 */
const attachGlobalCatch = (promise) => {
  promise.catch(err => {
    let msg = '';

    try {
      msg = JSON.parse(JSON.stringify(err.error)).message;

      if (typeof msg !== 'string') {
        msg = msg.join('\n');
      }
    } catch (e) {
      msg = err.message;
    }

    fail(`The problem has been occurred during the request: ${msg}`);

    return false;
  });
};

/**
 * @param {Promise} promise
 * @param {array} thenFns
 * @param {array} catchFns
 *
 * @return {void}
 */
const processRequest = (promise, thenFns, catchFns) => {
  for (let fn of thenFns) {
    promise.then(fn);
  }

  for (let fn of catchFns) {
    promise.catch(fn);
  }

  attachGlobalCatch(promise);
};

module.exports = {
  request,
};
