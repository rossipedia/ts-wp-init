#!/usr/bin/env node
import * as path from 'path';
import * as yargs from 'yargs';
import * as fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as chalk from 'chalk';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

const execAsync = promisify(exec);

const args = yargs.argv;
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
  'babel-core',
  'babel-loader',
  'webpack',
  'webpack-dev-server',
  'html-webpack-plugin',
  'emotion',
  'react-emotion',
  'babel-plugin-emotion',
  'ts-loader',
];

const commands = ['yarn init --yes', `yarn add -D ${packages.join(' ')}`];

const bail = (e: Error) => {
  console.error(e);
  process.exit(-1);
};

// rightPad, because I'm a rebel
function rightPad(s: string, len: number): string {
  if (s.length >= len) return s;
  let pad = len - s.length;
  while (pad-- > 0) s += ' ';
  return s;
}

const firstColumWidth = 12;
const wrap = require('wordwrap')(12, 80);

const log = (
  label: string,
  contents: string,
  color = chalk.cyan,
  labelColor = chalk.green,
) => {
  process.stdout.write(labelColor(rightPad(label, firstColumWidth)));
  console.log(color(wrap(contents).trim()));
};

log('Init', targetDir, chalk.yellow, chalk.reset);

async function writeFile(
  filename: string,
  contents: string | Buffer,
  encoding = 'utf8',
) {
  log('Writing', filename);
  await writeFileAsync(filename, contents, encoding);
}

async function writeJson(filename: string, object: any) {
  await writeFile(filename, JSON.stringify(object, undefined, 2));
}

async function run() {
  for (const command of commands) {
    log('Executing', command);
    const { stdout, stderr } = await execAsync(command);
    if (args.verbose) {
      console.log(chalk.dim.white(stdout));
    }
    if (stderr && args.stderr) {
      console.log(chalk.dim.red(stderr));
    }
  }

  await writeJson('tsconfig.json', {
    compilerOptions: {
      jsx: 'react',
      module: 'es2015',
      moduleResolution: 'node',
      noErrorTruncation: true,
      sourceMap: true,
      rootDir: './src',
      target: 'es2017',
    },
  });

  await writeFile(
    'webpack.config.js',
    `const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.js'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  devtool: 'source-maps',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ['babel-loader', 'ts-loader']
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
`,
  );

  log('Creating', 'src/');
  await mkdirAsync('src');

  await writeFile(
    'src/index.html',
    `<!doctype html>
<html>
  <head>
    <title>${path.dirname(targetDir)}</title>
    <meta charset="utf-8" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`,
  );

  await writeFile(
    'src/index.tsx',
    `import * as React from 'react';
import { render } from 'react-dom';
import styled from 'react-emotion';

const Message = styled.div\`
    font-size: 24px;
    font-weight: bold;
    font-family: sans-serif;
    color: maroon;
    text-align: center;
    text-decoration: underline;
\`;

render(
  <Message>Hello, World!</Message>,
  document.getElementById('app')
);
`,
  );

  await writeJson('.babelrc', {
    plugins: ['emotion'],
  });

  await writeJson('.prettierrc', {
    tabWidth: 2,
    semi: true,
    singleQuote: true,
    printWidth: 80,
  });

  log('Patching', `package.json (adding start script)`);
  const pkg = JSON.parse(await readFileAsync('package.json', 'utf-8'));

  if (!pkg.scripts) {
    pkg.scripts = {};
  }

  pkg.scripts.start = 'webpack-dev-server --debug --output-pathinfo --hot --content-base=dist/';
  await writeJson('package.json', pkg);
}

run().catch(bail);
