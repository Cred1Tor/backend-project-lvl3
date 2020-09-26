import program from 'commander';
import load from '.';
import { version } from '../package.json';

program.version(version)
  .description('Downloads a web page and saves it as html file.')
  .option('--output <dir>', 'output directory', process.cwd())
  .arguments('<srcUrl>')
  .action((srcUrl) => {
    try {
      load(srcUrl, program.output);
    } catch (e) {
      console.log(e.message);
      console.error(e);
      process.exitCode = 1;
    }
  });

export default () => program.parse(process.argv);
