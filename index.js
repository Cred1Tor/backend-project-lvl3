import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import debug from 'debug';
import Listr from 'listr';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
require('axios-debug-log');

const log = debug('page-loader:log');
const error = debug('page-loader:error');

const tagSrcMapping = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const convertUrlToFileName = (sourceUrl) => {
  const urlData = new URL(sourceUrl);
  const urlWithoutOrigin = `${urlData.host}${urlData.pathname}`;
  const fileName = urlWithoutOrigin.replace(/[^a-zA-Z0-9]/g, '-').replace(/-$/, '');
  return fileName;
};

const convertRelUrlToFileName = (relUrl, baseUrl) => {
  const fullUrl = new URL(relUrl, baseUrl);
  const { ext } = path.parse(relUrl);
  const urlWithoutExt = fullUrl.href.slice(0, -ext.length);
  const fileName = convertUrlToFileName(urlWithoutExt);
  return `${fileName}${ext}`;
};

const saveWebPageToFile = (source, dest) => {
  log(`saving page ${source} to file ${dest}`);
  return axios.get(source, { responseType: 'arraybuffer' })
    .then((response) => fs.writeFile(dest, response.data))
    .catch((e) => {
      throw new Error(`${e.message} (${e.config.method} ${e.config.url})`);
    });
};

export default (sourceUrl, destDir = process.cwd()) => {
  const tasks = new Listr([
    {
      title: `Connecting to ${sourceUrl}`,
      task: (ctx) => {
        const baseName = convertUrlToFileName(sourceUrl);
        const fileName = `${baseName}.html`;
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
            ctx.$ = cheerio.load(response.data);
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

          try {
            // eslint-disable-next-line no-new
            new URL(elSrc); // throw if url is relative
            log('url is absolute, skip');
          } catch (e) {
            log('url is relative, process');
            const elFilename = convertRelUrlToFileName(elSrc, sourceUrl);
            const elFilepath = path.join(ctx.assetsDirName, elFilename);
            log(`new rel url: ${elFilepath}`);
            $el.attr(urlAttrName, elFilepath);
            const absSrcUrl = new URL(elSrc, sourceUrl);
            const promise = fs.mkdir(ctx.destAssetsDirpath)
              .then(() => log(`${ctx.destAssetsDirpath} dir created`))
              .catch((err) => {
                if (err.code === 'EEXIST') {
                  return;
                }
                throw err;
              })
              .then(() => saveWebPageToFile(
                absSrcUrl.href,
                path.join(ctx.destAssetsDirpath, elFilename),
              ));
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
      task: (ctx) => fs.writeFile(ctx.destFilepath, ctx.$.html())
        .then(() => log(`${ctx.destFilepath} written\nfinished\n---------------------------`)),
    },
  ]);

  return tasks.run().catch((e) => {
    error(e.message);
    throw e;
  });
};
