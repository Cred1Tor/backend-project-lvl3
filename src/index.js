import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import url from 'url';
import _ from 'lodash';
import { promises as fs } from 'fs';

const convertUrlToFileName = (sourceUrl) => {
  const urlData = new URL(sourceUrl);
  const urlWithoutOrigin = `${urlData.host}${urlData.pathname}`;
  const fileName = urlWithoutOrigin.replace(/[^a-zA-Z0-9]/g, '-').replace(/-$/, '');
  return fileName;
};

const convertRelUrlToFileName = (relUrl) => {
  const pathData = path.parse(relUrl);
  const fileName = `${pathData.dir.slice(1)}-${pathData.name}`.replace(/^-/, '').replace(/[^a-zA-Z0-9]/g, '-');
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
      const elements = $('link[src], script[src], img[src]');
      const promises = [];

      elements.each((_i, el) => {
        const elSrc = cheerio(el).attr('src');

        try {
          URL(elSrc); // throw if url is relative
        } catch (e) {
          const elFilename = convertRelUrlToFileName(elSrc);
          const elFilepath = path.join(assetsDirName, elFilename);
          cheerio(el).attr('src', elFilepath);
          const promise = saveFile(
            url.resolve(sourceUrl, elSrc),
            path.join(destAssetsDirpath, elFilename),
          );
          promises.push(promise);
        }
      });

      if (promises.length === 0) { // not making a dir if no local assets
        return null;
      }

      return fs.mkdir(destAssetsDirpath, { resursive: true }).catch(_.noop)
        .then(() => Promise.all(promises));
    }).then(() => fs.writeFile(destFilepath, $.html()));
};
