#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const yargs = require("yargs");
const fs = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const chalk = require("chalk");
const readFileAsync = util_1.promisify(fs.readFile);
const writeFileAsync = util_1.promisify(fs.writeFile);
const mkdirAsync = util_1.promisify(fs.mkdir);
const execAsync = util_1.promisify(child_process_1.exec);
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
const bail = (e) => {
    console.error(e);
    process.exit(-1);
};
// rightPad, because I'm a rebel
function rightPad(s, len) {
    if (s.length >= len)
        return s;
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
async function writeFile(filename, contents, encoding = 'utf8') {
    log('Writing', filename);
    await writeFileAsync(filename, contents, encoding);
}
async function writeJson(filename, object) {
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
            module: 'commonjs',
            target: 'es5',
            noImplicitAny: false,
            sourceMap: false,
            jsx: 'react',
        },
    });
    await writeFile('webpack.config.js', `const path = require('path');
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
`);
    log('Creating', 'src/');
    await mkdirAsync('src');
    await writeFile('src/index.html', `<!doctype html>
<html>
  <head>
    <title>${path.dirname(targetDir)}</title>
    <meta charset="utf-8" />
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>`);
    await writeFile('src/index.tsx', `import * as React from 'react';
import { render } from 'react-dom';

render(
  <div>Hello, World!</div>,
  document.getElementById('app')
);
`);
    await writeFile('.babelrc', `{
  "plugins": ["emotion"]
}`);
    await writeFile('.prettierrc', `{
  "tabWidth": 2,
  "semi": true,
  "singleQuote": true,
  "printWidth": 80
}`);
    log('Patching', `package.json (adding start script)`);
    const pkg = JSON.parse(await readFileAsync('package.json', 'utf-8'));
    if (!pkg.scripts) {
        pkg.scripts = {};
    }
    pkg.scripts.start = 'webpack-dev-server -d --hot --content-base=dist/';
    await writeJson('package.json', pkg);
}
run().catch(bail);
