// Define the necessary modules.
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const recursive = require('recursive-readdir');
const {prompt} = require('inquirer');
const {request} = require('../../api');
const {success, warning, fail} = require('../../console');
const {isAuthBefore} = require('../../store');

// Define the "Create prompt" prompt.
const createProjectPrompt = [
  {
    type: 'input',
    name: 'git_path',
    message: 'Git Path:',
    validate: function(value) {
      return !!value.length;
    },
  },
  {
    type: 'list',
    name: 'manager',
    message: 'Manager',
    choices: ['composer', 'npm'],
  },
  {
    type: 'string',
    name: 'root_folder',
    message: 'Root Folder',
  },
  {
    type: 'string',
    name: 'main_branch',
    message: 'Main Branch',
    validate: function(value) {
      return !!value.length;
    },
  },
  {
    type: 'string',
    name: 'name',
    message: 'Name',
    validate: function(value) {
      return !!value.length;
    },
  },
];

/**
 * @return {void}
 */
const createProjectAction = () => {
  if (!isAuthBefore()) {
    fail('You need to be authorized for this action. Execute "codario auth" to continue.');
    return;
  }

  function showPrompt(predefault = null) {
    if (predefault) {
      for (let item of createProjectPrompt) {
        if ('git_path' === item.name) {
          item.default = predefault.gitUrl;
        }

        if ('main_branch' === item.name) {
          item.type = 'list';
          item.choices = predefault.branches;
        }

        if ('root_folder' === item.name) {
          let dirs = [];
          for (let item of predefault.rootDirs) {
            const dir = item.dir.length ? item.dir : '[root directory]';
            dirs.push(dir);
          }

          item.type = 'list';
          item.choices = dirs;
        }
      }

      for (let i in createProjectPrompt) {
        if ('manager' === createProjectPrompt[i].name) {
          createProjectPrompt.splice(i, 1);
        }
      }
    }

    prompt(createProjectPrompt).then(answers => {
      createProjectRequest(answers, predefault.rootDirs);
    });
  }

  if (!fs.existsSync('.git/')) {
    warning('You have executed this command outside a root of GIT repository, auto-filling is disabled!');
    showPrompt();
  } else {
    autofillPrompt().then(data => {
      showPrompt(data);
    });
  }
};

/**
 * @return {object}
 */
const autofillPrompt = () => {
  const gitUrl = shell.exec('git config --get remote.origin.url', {silent: true}).stdout.trim();
  const _branches = shell.exec('git branch -r', {silent: true}).stdout.split('\n');

  let branches = [];

  for (let branch of _branches) {
    let _branch = branch.trim();
    _branch = _branch.substr(_branch.indexOf('/') + 1);

    if (_branch.length) {
      branches.push(_branch);
    }
  }

  let rootDirs = [];

  function ignoreFunc(file, stats) {
    const files = [
      'composer.lock',
      'composer.json',
      'package.json',
      'package-lock.json',
      'npm-shrinkwrap.json',
    ];

    return !stats.isDirectory() && -1 === files.indexOf(path.basename(file));
  }

  return recursive('./', [ignoreFunc]).then(files => {
    let skip = [];

    for (let file of files) {
      const dir = '.' !== path.dirname(file) ? path.dirname(file) + '/' : '';
      const dirWithoutSlash = '.' !== path.dirname(file) ? path.dirname(file) : '';
      const filename = path.basename(file);

      if (-1 !== ['composer.lock', 'composer.json'].indexOf(filename)) {
        const existsJson = -1 !== files.indexOf(dir + 'composer.json');
        const existsLock = -1 !== files.indexOf(dir + 'composer.lock');

        if (existsJson && existsLock && -1 === skip.indexOf(dir)) {
          skip.push(dir);

          rootDirs.push({
            type: 'composer',
            dir: dirWithoutSlash,
          });
        }
      }

      if (-1 !== ['package.json', 'package-lock.json', 'npm-shrinkwrap.json'].indexOf(filename)) {
        const existsJson = -1 !== files.indexOf(dir + 'package.json');
        const existsLock = -1 !== files.indexOf(dir + 'package-lock.json') || -1 !== files.indexOf(dir + 'npm-shrinkwrap.json');

        if (existsJson && existsLock && -1 === skip.indexOf(dir)) {
          skip.push(dir);

          rootDirs.push({
            type: 'npm',
            dir: dirWithoutSlash,
          });
        }
      }
    }

    return {
      rootDirs,
      gitUrl,
      branches,
    };
  });
};

/**
 * @param {Object} data: contains {git_path, manager, root_folder, main_branch, name} properties.
 * @param {array} rootDirs: contains objects with {type, dir} properties.
 *
 * @return {string}
 */
const createProjectRequest = (data, rootDirs = []) => {
  if ('[root directory]' === data.root_folder) {
    data.root_folder = '';
  }

  if (!data.hasOwnProperty('manager')) {
    for (let item of rootDirs) {
      if (data.root_folder === item.dir) {
        data.manager = item.type;
      }
    }
  }

  warning('Creation of a project takes about 30 seconds...');

  request('projects', 'POST', data).handler(body => {
    const messages = body.message.join(', ');

    if (!body.success) {
      fail(`The project couldn't created: ${messages}`);
      return;
    }

    success(`${messages} The link: https://app.app-guard.io/projects/${body.project}`);
  }).done();
};

module.exports = {
  createProjectAction,
};
