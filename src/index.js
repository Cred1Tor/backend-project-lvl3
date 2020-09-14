import axios from 'axios';
import path from 'path';
import cheerio from 'cheerio';
import url from 'url';
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

const saveFile = (source, dest) => axios.get(source)
  .then((response) => fs.writeFile(dest, response.data));

export default (sourceUrl, destDir = process.cwd()) => {
  const sourceUrlData = new URL(sourceUrl);
  const sourceHost = sourceUrlData.host;
  const dirName = `${convertUrlToFileName(sourceUrl)}_files`;
  const fileName = convertUrlToFileName(sourceUrl);
  const dest = path.join(destDir, `${fileName}.html`);
  const destAssetsDir = path.join(destDir, dirName);
  let $;
  let elements;
  return axios.get(sourceUrl)
    .then((response) => {
      $ = cheerio.load(response.data);
      return fs.writeFile(dest, $.html());
    }).then(() => {
      elements = $('link, script, img[src]');
      if (elements.length === 0) {
        throw new Error('no links');
      }
      return fs.mkdir(destAssetsDir).catch(() => {});
    }).then(() => {
      const promises = [];
      elements.each((i, el) => {
        const elSrc = cheerio(el).attr('src');
        const elSrcUrl = new URL(elSrc, sourceUrl);
        if (elSrcUrl.host !== sourceHost) {
          return;
        }
        // console.log(elSrc);
        const elFileName = convertRelUrlToFileName(elSrc);
        const newPath = path.join(dirName, elFileName);
        // console.log(elFileName);
        // console.log(newPath);
        $(el).attr('src', newPath);
        promises.push(saveFile(url.resolve(sourceUrl, elSrc), path.join(destAssetsDir, elFileName)));
      });
      return Promise.all(promises);
    });
};

// console.log(new URL('example.html', 'https://fake.com/123.html'));
