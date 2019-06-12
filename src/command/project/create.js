// Define the necessary modules.
const fs = require('fs');
const shell = require('shelljs');
const path = require('path');
const recursive = require('recursive-readdir');
const {prompt} = require('inquirer');
const {request} = require('../../api');
const {success, warning, fail} = require('../../console');
const {isAuthBefore} = require('../../store');
const {createConfigFileAction} = require('../configs/create-file');

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
    message: 'Manager:',
    choices: ['composer', 'npm', 'dockerfile'],
  },
  {
    type: 'string',
    name: 'root_folder',
    message: 'Root Folder:',
  },
  {
    type: 'string',
    name: 'main_branch',
    message: 'Main Branch:',
    validate: function(value) {
      return !!value.length;
    },
  },
  {
    type: 'string',
    name: 'name',
    message: 'Name:',
    validate: function(value) {
      return !!value.length;
    },
  },
];

// Define the "Create config file" prompt.
const createConfigFilePrompt = [
  {
    type: 'confirm',
    name: 'continue',
    default: false,
    message: 'Do you want to create the JSON-config file?',
  },
];

/**
 * @return {void}
 */
const createProjectAction = () => {
  if (!isAuthBefore()) {
    fail('You need to be authorized to process this action. Execute "codario auth" to continue.');
    return;
  }

  function showPrompt(predefined = null) {
    if (predefined) {
      for (let item of createProjectPrompt) {
        if ('git_path' === item.name) {
          item.default = predefined.gitUrl;
        }

        if ('main_branch' === item.name) {
          item.type = 'list';
          item.choices = predefined.branches;
        }

        if ('root_folder' === item.name) {
          let dirs = [];
          for (let item of predefined.rootDirs) {
            const dir = item.dir.length ? item.dir : 'root directory';
            dirs.push('[' + dir + ']' + ' (' + item.type + ')');
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
      createProjectRequest(answers, predefined.rootDirs);
    });
  }

  if (!fs.existsSync('.git/')) {
    warning('You have executed this command outside a root of your GIT repository, the auto-filling is disabled!');
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

  let rootDirs = [{
    type: 'dockerfile',
    dir: '',
  }];

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
 * @param {object} data: contains {git_path, manager, root_folder, main_branch, name} properties.
 * @param {array} rootDirs: contains objects with {type, dir} properties.
 *
 * @return {string}
 */
const createProjectRequest = (data, rootDirs = []) => {
  const matches = data.root_folder.match(/\[(.+?)\] \((.+?)\)/);

  if (matches) {
    if ('root directory' === matches[1]) {
      data.root_folder = '';
    } else {
      data.root_folder = matches[1];
    }

    if (!data.hasOwnProperty('manager')) {
      data.manager = matches[2];
    }
  }

  warning('The project will be created - you have 30 seconds to grab some water in the meantime, stay hydrated!');

  request('projects', 'POST', data).handler(body => {
    const messages = body.message.join(', ');

    if (!body.success) {
      fail(`The project couldn't created: ${messages}`);
      return;
    }

    success(`${messages} The link: https://app.codario.io/projects/${body.project}`);

    const rootFolder = data.root_folder.length ? data.root_folder + '/' : '';

    prompt(createConfigFilePrompt).then(answers => {
      if (answers.continue) {
        createConfigFileAction(rootFolder);
      }
    });

  }).done();
};

module.exports = {
  createProjectAction,
};
