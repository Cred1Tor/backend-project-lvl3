import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import os from 'os';
import _ from 'lodash';
import load from '../src/index.js';

const fixturesDirpath = path.join(__dirname, '__fixtures__');
const testResultDirpath = path.join(os.tmpdir(), 'page-loader-tests');
const readFile = (baseDir, filename, encoding = 'utf-8') => fs.readFile(path.join(baseDir, filename), encoding);

beforeEach(async () => {
  await fs.rmdir(testResultDirpath, { recursive: true }).catch(_.noop);
  await fs.mkdir(testResultDirpath).catch(_.noop);
});

test('load and save a page with assets', async () => {
  const promises = [
    readFile(fixturesDirpath, 'page.html'),
    readFile(fixturesDirpath, 'result.html'),
    readFile(fixturesDirpath, '123.css'),
    readFile(fixturesDirpath, 'pogey.png', null),
  ];
  const [srcHtml, expectedHtml, textAsset, imageAsset] = await Promise.all(promises).catch(_.noop);

  nock('https://fakeaddress.com')
    .get('/')
    .reply(200, srcHtml);

  nock('https://fakeaddress.com')
    .get('/files/123.css')
    .reply(200, textAsset);

  nock('https://fakeaddress.com')
    .get('/pogey.png')
    .reply(200, imageAsset);

  await load('https://fakeaddress.com/', testResultDirpath).catch(_.noop);
  const promises2 = [
    readFile(testResultDirpath, 'fakeaddress-com.html'),
    readFile(testResultDirpath, 'fakeaddress-com_files/files-123.css'),
    readFile(testResultDirpath, 'fakeaddress-com_files/pogey.png', null),
    fs.readdir(testResultDirpath),
    fs.readdir(path.join(testResultDirpath, 'fakeaddress-com_files')),
  ];
  const [
    resultHtml,
    resultTextAsset,
    resultImageAsset,
    dir1Files,
    dir2Files,
  ] = await Promise.all(promises2).catch(_.noop);

  expect(resultHtml).toBe(expectedHtml);
  expect(resultTextAsset).toBe(textAsset);
  expect(resultImageAsset).toEqual(imageAsset);
  expect(dir1Files).toHaveLength(2);
  expect(dir2Files).toHaveLength(2);
});

test('load and save a page without assets', async () => {
  const srcHtml = await readFile(fixturesDirpath, 'page2.html');

  nock('https://fakeaddress2.com')
    .get('/')
    .reply(200, srcHtml);

  await load('https://fakeaddress2.com/', testResultDirpath).catch(_.noop);
  const resultHtml = await readFile(testResultDirpath, 'fakeaddress2-com.html').catch(_.noop);
  const dirFiles = await fs.readdir(testResultDirpath).catch(_.noop);

  expect(resultHtml).toBe(srcHtml);
  expect(dirFiles).toHaveLength(1);
});
