import axios from 'axios';
import path from 'path';
import { promises as fs } from 'fs';

const convertUrlToFileName = (sourceUrl) => {
  const urlData = new URL(sourceUrl);
  const urlWithoutOrigin = `${urlData.host}${urlData.pathname}`;
  const fileName = urlWithoutOrigin.replace(/[^a-zA-Z0-9]/g, '-');
  return fileName.slice(0, -1).concat('.html');
};

export default (sourceUrl, destDir = process.cwd()) => axios.get(sourceUrl)
  .then((response) => {
    const fileName = convertUrlToFileName(sourceUrl);
    const dest = path.join(destDir, fileName);
    return fs.writeFile(dest, response.data);
  });
