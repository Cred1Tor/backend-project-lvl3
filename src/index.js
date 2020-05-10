import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import { promises as fs } from 'fs';

const convertUrlToFileName = (sourceUrl) => {
  const urlData = new URL(sourceUrl);
  const urlWithoutOrigin = `${urlData.host}${urlData.pathname}`;
  const fileName = urlWithoutOrigin.replace(/[^a-zA-Z0-9]/g, '-');
  return fileName.slice(0, -1).concat('.html');
};

export default (sourceUrl, destDir = process.cwd()) => axios.get(sourceUrl)
  .then((response) => {
    const $ = cheerio.load(response.data);
    const fileName = convertUrlToFileName(sourceUrl);
    const dest = path.join(destDir, fileName);
    fs.writeFile(dest, $.html());
  });
