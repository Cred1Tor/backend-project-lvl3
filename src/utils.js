import axios from 'axios';
import path from 'path';
import Listr from 'listr';
import debug from 'debug';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';

const log = debug('page-loader');

const tagSrcMapping = {
  link: 'href',
  script: 'src',
  img: 'src',
};

export const convertUrlToFileNameWithoutExt = (sourceUrl) => {
  const { host, pathname } = new URL(sourceUrl);
  const urlWithoutOrigin = `${host}${pathname}`;
  const fileName = urlWithoutOrigin.replace(/\W/g, '-').replace(/-$/, '');
  return fileName;
};

export const convertUrlToFileNameWithExt = (sourceUrl) => {
  const { ext } = path.parse(sourceUrl);
  const urlWithoutExt = sourceUrl.slice(0, sourceUrl.length - ext.length);
  const fileName = convertUrlToFileNameWithoutExt(urlWithoutExt);
  const newExt = ext || '.html';
  return `${fileName}${newExt}`;
};

export const saveWebPageToFile = (source, dest) => axios.get(source, { responseType: 'arraybuffer' })
  .then((response) => fs.writeFile(dest, response.data, 'utf-8'));

export const convertAssetUrls = ($, sourceUrl, assetsDirName) => {
  const srcHostname = new URL(sourceUrl).hostname;
  const elements = $('link[href], script[src], img[src]');
  const assetUrls = [];

  elements.each((_i, el) => {
    const $el = cheerio(el);
    const urlAttrName = tagSrcMapping[el.tagName];
    const elSrc = $el.attr(urlAttrName);
    log(`working on tag ${el.tagName} with ${urlAttrName}="${elSrc}"`);
    const fullSrcUrl = new URL(elSrc, sourceUrl);

    if (fullSrcUrl.hostname !== srcHostname) {
      log('url is absolute, skip');
    } else {
      log('url is relative, process');
      const elFilename = convertUrlToFileNameWithExt(fullSrcUrl.href);
      const assetFilepath = path.join(assetsDirName, elFilename);
      log(`asset url: ${assetFilepath}`);
      $el.attr(urlAttrName, assetFilepath);
      const source = fullSrcUrl.href;
      assetUrls.push({ source, assetFilepath });
    }
  });

  return assetUrls;
};

export const loadAssets = (assetUrls, destDir) => {
  const tasks = new Listr([
    {
      title: 'Saving assets',
      task: () => {
        const assetTasks = new Listr([], { concurrent: true, exitOnError: false });

        assetUrls.forEach(({ source, assetFilepath }) => {
          const dest = path.join(destDir, assetFilepath);
          log(`saving page ${source} to file ${dest}`);
          const promise = saveWebPageToFile(source, dest);
          assetTasks.add({
            title: `Saving ${source}`,
            task: () => promise,
          });
        });

        return assetTasks;
      },
    },
  ]);

  return tasks.run();
};
