import program from 'commander';
import load from './index.js';
import { version } from '../package.json';

program.version(version)
  .description('Downloads a web page and saves it as html file.')
  .option('--output <dir>', 'output directory', process.cwd())
  .arguments('<srcUrl>')
  .action((srcUrl) => load(srcUrl, program.output)
    .catch((e) => {
      console.error(e.message);
      process.exitCode = 1;
    })
    .then(() => console.log(`${srcUrl} saved in ${program.output}`)));

export default () => program.parse(process.argv);
