#!/usr/bin/env node
const Promise = require('bluebird');
const path = require('path');
const args = require('yargs').argv;

const fs = Promise.promisifyAll(require('fs'));
const proc = Promise.promisifyAll(require('child_process'), {multiArgs: true});
const chalk = require('chalk');

const targetDir = path.resolve(args._[0] || process.cwd());

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir);
}

if (fs.readdirSync(targetDir).length > 0) {
  console.error(`Target folder ${targetDir} not empty, aborting...`);
  process.exit(-1);
}

process.chdir(targetDir);

const packages = [
  'typescript',
  'react',
  'react-dom',
  '@types/react',
  '@types/react-dom',
  'webpack',
  'webpack-dev-server',
  'html-webpack-plugin',
  'less',
  'less-loader',
  'file-loader',
  'url-loader',
  'style-loader',
  'css-loader',
  'ts-loader'
];

const commands = ['yarn init --yes', `yarn add ${packages.join(' ')}`];

const bail = e => {
  console.error(e);
  process.exit(-1);
};

// rightPad, because I'm a rebel
function rightPad(s, len) {
  if (s.length >= len) return s;
  let pad = len - s.length;
  while (pad-- > 0)
    s += ' ';
  return s;
}

const firstColumWidth = 12;
const wrap = require('wordwrap')(12, 80);

const log = (label, contents, color = chalk.cyan, labelColor = chalk.green) => {
  process.stdout.write(labelColor(rightPad(label, firstColumWidth)));
  console.log(color(wrap(contents).trim()));
};

log('Init', targetDir, chalk.yellow, chalk.reset);

Promise
  .mapSeries(commands, command => {
    log('Executing', command);
    return proc.execAsync(command).then(
      ([stdout, stderr]) => {
        if (args.verbose) {
          console.log(chalk.dim.white(stdout));
        }
        if (stderr && args.stderr) {
          console.log(chalk.dim.red(stderr));
        }
      },
      bail
    );
  })
  .then(() => {
    log('Writing', 'tsconfig.json');
    return fs.writeFileAsync(
      'tsconfig.json',
      JSON.stringify({
        compilerOptions: {
          module: 'commonjs',
          target: 'es5',
          noImplicitAny: false,
          sourceMap: false,
          jsx: 'react'
        }
      }),
      'utf-8'
    );
  })
  .then(() => {
    log('Writing', 'webpack.config.json');

    const contents = `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.js'
  },
  resolve: {
    extensions: ['.js', '.ts', '.tsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'ts-loader'
      },
      {
        test: /\.less$/,
        use: ['style-loader', 'css-loader', 'less-loader']
      },
      {
        test: /\.(svg|gif|png|jpg)$/,
        loader: 'url-loader'
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      minify: false,
      template: 'src/index.html'
    })
  ]
};
`;
    return fs.writeFileAsync('webpack.config.js', contents, 'utf-8');
  })
  .then(() => {
    log('Creating', 'src/');
    return fs.mkdirAsync('src');
  })
  .then(() => {
    log('Writing', 'src/index.html');
    const contents = `<!doctype html>
<html>
  <head>
    <title>${path.dirname(targetDir)}</title>
    <meta charset="utf-8" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`;

    return fs.writeFileAsync('src/index.html', contents, 'utf-8');
  })
  .then(() => {
    log('Writing', 'src/index.tsx');

    const contents = `
import * as React from 'react';
import { render } from 'react-dom';

render(
  <div>Hello, World!</div>,
  document.getElementById('app')
);
`;
    return fs.writeFileAsync('src/index.tsx', contents, 'utf-8');
  })
  .then(() => {
    log('Patching', `package.json (adding start script)`);

    const package = JSON.parse(fs.readFileSync('package.json', 'utf-8'));

    if (!package.scripts) {
      package.scripts = {};
    }

    package.scripts.start = "webpack-dev-server -d --hot --content-base=dist/";
    return fs.writeFileAsync('package.json', JSON.stringify(package, undefined, 2));
  })
  .catch(bail);