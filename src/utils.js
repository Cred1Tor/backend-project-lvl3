import axios from 'axios';
import path from 'path';
import { promises as fs } from 'fs';

export const convertUrlToFileNameWithoutExt = (sourceUrl) => {
  const { host, pathname } = new URL(sourceUrl);
  const urlWithoutOrigin = `${host}${pathname}`;
  const fileName = urlWithoutOrigin.replace(/[^a-zA-Z0-9]/g, '-').replace(/-$/, '');
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
  .then((response) => fs.writeFile(dest, response.data, 'utf-8'))
  .catch((e) => {
    throw new Error(`${e.message} (${e.config.method} ${e.config.url})`);
  });
