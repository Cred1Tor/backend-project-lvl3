import program from 'commander';
import load from '.';
import { version } from '../package.json';

program.version(version)
  .description('Downloads a web page and saves it as html file.')
  .option('--output <dir>', 'output directory', process.cwd())
  .arguments('<srcUrl>')
  .action(async (srcUrl) => {
    try {
      await load(srcUrl, program.output);
    } catch (e) {
      console.log(e.message);
      process.exitCode = 1;
    }
  });

export default () => program.parse(process.argv);
