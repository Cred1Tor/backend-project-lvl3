import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';
import debug from 'debug';
import { convertUrlToFileNameWithoutExt, convertAssetUrls, loadAssets } from './src/utils.js';
import 'axios-debug-log';

const log = debug('page-loader');

export default (sourceUrl, destDir = process.cwd()) => {
  const baseName = convertUrlToFileNameWithoutExt(sourceUrl);
  const fileName = `${baseName}.html`;
  const assetsDirName = `${baseName}_files`;
  const destFilepath = path.join(destDir, fileName);
  const destAssetsDirpath = path.join(destDir, assetsDirName);
  let $;

  log(`saving ${sourceUrl} as ${destFilepath}`);
  log(`assets dir: ${destAssetsDirpath}`);

  return axios.get(sourceUrl)
    .then((response) => {
      $ = cheerio.load(response.data, { decodeEntities: false });
      return fs.mkdir(destAssetsDirpath);
    }).then(() => convertAssetUrls($, sourceUrl, assetsDirName))
    .then((assetUrls) => {
      log('URLs converted');
      return assetUrls;
    })
    .then((assetUrls) => loadAssets(assetUrls, destDir))
    .then(() => log('assets saved'))
    .then(() => fs.writeFile(destFilepath, $.html(), 'utf-8'))
    .then(() => log(`${destFilepath} written\nfinished\n---------------------------`))
    .catch((e) => {
      log(e.message);
      throw e;
    });
};
