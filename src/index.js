import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import debug from 'debug';

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

const convertRelUrlToFileName = (relUrl) => {
  const pathData = path.parse(relUrl);
  const fileName = `${pathData.dir}-${pathData.name}`.replace(/^-/, '').replace(/[^a-zA-Z0-9]/g, '-');
  return `${fileName}${pathData.ext}`;
};

const saveWebPageToFile = (source, dest) => {
  log(`saving page ${source} to file ${dest}`);
  return axios.get(source, { responseType: 'arraybuffer' })
    .then((response) => fs.writeFile(dest, response.data))
    .catch(error);
};

export default (sourceUrl, destDir = process.cwd()) => {
  const assetsDirName = `${convertUrlToFileName(sourceUrl)}_files`;
  const fileName = `${convertUrlToFileName(sourceUrl)}.html`;
  const destFilepath = path.join(destDir, fileName);
  const destAssetsDirpath = path.join(destDir, assetsDirName);
  let $;

  log(`saving ${sourceUrl} as ${fileName} in ${destFilepath}`);
  log(`assets dir: ${destAssetsDirpath}`);

  return axios.get(sourceUrl)
    .then((response) => {
      $ = cheerio.load(response.data);
      const elements = $('link[href], script[src], img[src]');
      const promises = [];

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
          const elFilename = convertRelUrlToFileName(elSrc);
          const elFilepath = path.join(assetsDirName, elFilename);
          log(`new rel url: ${elFilepath}`);
          $el.attr(urlAttrName, elFilepath);
          const absSrcUrl = new URL(elSrc, sourceUrl);
          const promise = saveWebPageToFile(
            absSrcUrl.href,
            path.join(destAssetsDirpath, elFilename),
          );
          promises.push(promise);
        }
      });

      log(`${promises.length} assets total`);
      if (promises.length === 0) { // only make a dest dir for html file if no assets
        return fs.mkdir(destDir, { recursive: true })
          .then(() => log(`${destDir} dir created`))
          .catch(error);
      }

      return fs.mkdir(destAssetsDirpath, { recursive: true })
        .then(() => log(`${destAssetsDirpath} dir created`))
        .catch(error)
        .then(() => Promise.all(promises));
    }).then(() => fs.writeFile(destFilepath, $.html())
      .then(() => log(`${destFilepath} written\nfinished\n---------------------------`))
      .catch(error));
};
