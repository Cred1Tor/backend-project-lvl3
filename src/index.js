import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import debug from 'debug';
import Listr from 'listr';
import { createRequire } from 'module';
import { saveWebPageToFile, convertUrlToFileNameWithExt, convertUrlToFileNameWithoutExt } from './utils';

const require = createRequire(import.meta.url);
require('axios-debug-log');

const log = debug('page-loader');

const tagSrcMapping = {
  link: 'href',
  script: 'src',
  img: 'src',
};

export default (sourceUrl, destDir = process.cwd()) => {
  const tasks = new Listr([
    {
      title: `Connecting to ${sourceUrl}`,
      task: (ctx) => {
        const baseName = convertUrlToFileNameWithoutExt(sourceUrl);
        const fileName = `${baseName}.html`;
        ctx.srcHostname = new URL(sourceUrl).hostname;
        ctx.assetsDirName = `${baseName}_files`;
        ctx.destFilepath = path.join(destDir, fileName);
        ctx.destAssetsDirpath = path.join(destDir, ctx.assetsDirName);

        log(`saving ${sourceUrl} as ${ctx.destFilepath}`);
        log(`assets dir: ${ctx.destAssetsDirpath}`);

        return fs.stat(destDir)
          .then((stats) => {
            if (!stats.isDirectory()) {
              throw new Error(`ENOTDIR: ${destDir} is not a directory`, destDir);
            }
          })
          .then(() => fs.access(ctx.destFilepath)
            .catch(() => true)
            .then((caught) => {
              if (!caught) {
                throw new Error(`${ctx.destFilepath} already exists`, ctx.destFilepath);
              }
            }))
          .then(() => fs.access(ctx.destAssetsDirpath)
            .catch(() => true)
            .then((caught) => {
              if (!caught) {
                throw new Error(`${ctx.destAssetsDirpath} already exists`, ctx.destAssetsDirpath);
              }
            }))
          .then(() => axios.get(sourceUrl)
            .catch((e) => {
              throw new Error(`${e.message} (${e.config.method} ${e.config.url})`);
            }))
          .then((response) => {
            ctx.$ = cheerio.load(response.data, { decodeEntities: false });
          });
      },
    },
    {
      title: 'Saving assets',
      task: (ctx) => {
        const elements = ctx.$('link[href], script[src], img[src]');
        const assetTasks = new Listr([], { concurrent: true, exitOnError: false });

        elements.each((_i, el) => {
          const $el = cheerio(el);
          const urlAttrName = tagSrcMapping[el.tagName];
          const elSrc = $el.attr(urlAttrName);
          log(`working on tag ${el.tagName} with ${urlAttrName}="${elSrc}"`);
          const fullSrcUrl = new URL(elSrc, sourceUrl);

          if (fullSrcUrl.hostname !== ctx.srcHostname) {
            log('url is absolute, skip');
          } else {
            log('url is relative, process');
            const elFilename = convertUrlToFileNameWithExt(fullSrcUrl.href);
            const elFilepath = path.join(ctx.assetsDirName, elFilename);
            log(`new rel url: ${elFilepath}`);
            $el.attr(urlAttrName, elFilepath);
            const promise = fs.mkdir(ctx.destAssetsDirpath)
              .then(() => log(`${ctx.destAssetsDirpath} dir created`))
              .catch((err) => {
                if (err.code === 'EEXIST') {
                  return;
                }
                throw err;
              })
              .then(() => {
                const source = fullSrcUrl.href;
                const dest = path.join(ctx.destAssetsDirpath, elFilename);
                log(`saving page ${source} to file ${dest}`);
                return saveWebPageToFile(source, dest);
              });
            assetTasks.add({
              title: `Saving ${elSrc}`,
              task: () => promise,
            });
          }
        });

        return assetTasks;
      },
    },
    {
      title: 'Saving main page',
      task: (ctx) => fs.writeFile(ctx.destFilepath, ctx.$.html(), 'utf-8')
        .then(() => log(`${ctx.destFilepath} written\nfinished\n---------------------------`)),
    },
  ]);

  return tasks.run().catch((e) => {
    log(e.message);
    throw e;
  });
};
