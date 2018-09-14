#!/usr/bin/env node
import { resolve, dirname } from 'path';
import { existsSync, readFile, mkdir, mkdirSync, readdirSync } from 'fs';
import yargs from 'yargs';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

import log from './log';
import { writeFile, writeJson } from './write-file';
import { prettierOpts } from './format';

const readFileAsync = promisify(readFile);
const mkdirAsync = promisify(mkdir);
const execAsync = promisify(exec);

const bail = (e: Error) => {
  console.error(e);
  process.exit(-1);
};
const args = yargs.argv;

async function run() {
  const targetDir = resolve(args._[0] || process.cwd());

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir);
  }

  if (readdirSync(targetDir).length > 0) {
    console.error(`Target folder ${targetDir} not empty, aborting...`);
    process.exit(-1);
  }
  log('Init', targetDir, chalk.yellow, chalk.reset);

  process.chdir(targetDir);
  await runCommand('yarn init --yes'); // kick it off

  await installDevPackages([
    '@types/react',
    '@types/react-dom',
    'html-webpack-plugin',
    'react',
    'react-dom',
    'ts-loader',
    'typescript',
    'webpack',
    'webpack-cdn-plugin',
    'webpack-cli',
    'webpack-serve',
  ]);

  log('Creating', '.vscode/');
  await mkdirAsync('.vscode');
  await writeJson('.vscode/settings.json', {
    'typescript.tsdk': 'node_modules/typescript/lib',
  });

  await writeTsConfig();
  await writeWebpackConfig();

  log('Creating', 'src/');
  await mkdirAsync('src');
  await writeIndexHtml('src/index.html', dirname(targetDir));
  await writeIndexTsx('src/index.tsx');

  await writeEditorConfig();
  await writeJson('.prettierrc', prettierOpts);

  log('Patching', `package.json (adding start script)`);
  const pkg = JSON.parse(await readFileAsync('package.json', 'utf-8'));

  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  pkg.scripts.start = 'webpack-serve --open';
  await writeJson('package.json', pkg);
}

async function runCommand(command: string) {
  log('Executing', command);
  const { stdout, stderr } = await execAsync(command);
  if (args.verbose) {
    console.log(chalk.dim.white(stdout));
  }
  if (stderr && args.stderr) {
    console.log(chalk.dim.red(stderr));
  }
}

function installDevPackages(packages: string[]) {
  return runCommand(`yarn add -D ${packages.join(' ')}`);
}

function writeEditorConfig() {
  return writeFile({
    filename: '.editorconfig',
    contents: `
      root = true

      [*]
      indent_size = 2
      indent_style = space
      tab_width = 2
      charset = utf-8
    `,
    deindent: true,
  });
}

function writeTsConfig() {
  return writeJson('tsconfig.json', {
    compilerOptions: {
      jsx: 'react',
      module: 'es2015',
      moduleResolution: 'node',
      noErrorTruncation: true,
      outDir: './dist',
      rootDir: './src',
      sourceMap: true,
      target: 'es2017',
    },
  });
}

function writeWebpackConfig() {
  return writeFile({
    filename: 'webpack.config.js',
    contents: `
      const path = require('path');
      const HtmlWebpackPlugin = require('html-webpack-plugin');
      const WebpackCdnPlugin = require('webpack-cdn-plugin');

      module.exports = {
        entry: './src',
        output: {
          path: path.resolve(__dirname, 'dist'),
          filename: 'app.js',
        },
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.jsx'],
        },
        devtool: 'source-maps',
        mode: 'development',
        module: {
          rules: [
            {
              test: /.tsx?$/,
              use: ['ts-loader'],
            },
          ],
        },
        plugins: [
          new HtmlWebpackPlugin({
            minify: false,
            template: 'src/index.html',
          }),
          new WebpackCdnPlugin({
            modules: [
              {
                name: 'react',
                var: 'React',
                path: 'umd/react.development.js',
              },
              {
                name: 'react-dom',
                var: 'ReactDOM',
                path: 'umd/react-dom.development.js',
              },
            ],
          }),
        ],
      };
    `,
    format: true,
  });
}

function writeIndexHtml(filename: string, title: string) {
  return writeFile({
    filename,
    contents: `
      <!doctype html>
      <html>
        <head>
          <title>${title}</title>
          <meta charset="utf-8" />
        </head>
        <body>
          <div id="app"></div>
        </body>
      </html>
    `,
  });
}

async function writeIndexTsx(filename: string) {
  return writeFile({
    filename,
    contents: `
      import * as React from 'react';
      import { render } from 'react-dom';

      class App extends React.Component {
        render() {
          return <div>Hello, World!</div>;
        }
      }

      render(<App />, document.getElementById('app'));
    `,
    format: true,
  });
}

run().catch(bail);
