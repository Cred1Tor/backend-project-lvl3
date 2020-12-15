import axios from 'axios';
import path from 'path';
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

  log(`saving ${sourceUrl} as ${destFilepath}`);
  log(`assets dir: ${destAssetsDirpath}`);

  return axios.get(sourceUrl)
    .then((response) => {
      log('looking for assets');
      return convertAssetUrls(response.data, sourceUrl, assetsDirName);
    })
    .then(({ assetUrls, html }) => {
      log(`saving main page to ${destFilepath}`);
      return fs.writeFile(destFilepath, html, 'utf-8').then(() => assetUrls);
    })
    .then((assetUrls) => {
      log(`assets to save: ${assetUrls.length}`);
      return loadAssets(assetUrls, destDir);
    })
    .catch((e) => {
      log(e.message);
      throw e;
    });
};
