import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import url from 'url';
import _ from 'lodash';
import { promises as fs } from 'fs';

// process.on('unhandledRejection', console.log);

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

const saveFile = (source, dest) => axios.get(source, { responseType: 'arraybuffer' })
  .then((response) => fs.writeFile(dest, response.data));

export default (sourceUrl, destDir = process.cwd()) => {
  const assetsDirName = `${convertUrlToFileName(sourceUrl)}_files`;
  const fileName = `${convertUrlToFileName(sourceUrl)}.html`;
  const destFilepath = path.join(destDir, fileName);
  const destAssetsDirpath = path.join(destDir, assetsDirName);
  let $;

  return axios.get(sourceUrl)
    .then((response) => {
      $ = cheerio.load(response.data);
      const elements = $('link[href], script[src], img[src]');
      const promises = [];

      elements.each((_i, el) => {
        const $el = cheerio(el);
        const urlAttrName = tagSrcMapping[el.tagName];
        const elSrc = $el.attr(urlAttrName);

        try {
          // eslint-disable-next-line no-new
          new URL(elSrc); // throw if url is relative
        } catch (e) {
          const elFilename = convertRelUrlToFileName(elSrc);
          const elFilepath = path.join(assetsDirName, elFilename);
          $el.attr(urlAttrName, elFilepath);
          const promise = saveFile(
            url.resolve(sourceUrl, elSrc),
            path.join(destAssetsDirpath, elFilename),
          );
          promises.push(promise);
        }
      });

      if (promises.length === 0) { // only make a dest dir for html file if no assets
        return fs.mkdir(destDir, { recursive: true }).catch(_.noop);
      }

      return fs.mkdir(destAssetsDirpath, { recursive: true })
        .then(() => Promise.all(promises));
    }).then(() => fs.writeFile(destFilepath, $.html()));
};
