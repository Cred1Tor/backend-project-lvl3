#!/usr/bin/env node

import program from 'commander';
import load from './index.js';
// import { version } from '../package.json';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');

program.version(version)
  .description('Downloads a web page and saves it as html file.')
  .option('--output <dir>', 'output directory', process.cwd())
  .arguments('<srcUrl>')
  .action((srcUrl) => load(srcUrl, program.output)
    .then(() => console.log(`${srcUrl} saved in ${program.output}`)
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })));

program.parse(process.argv);
