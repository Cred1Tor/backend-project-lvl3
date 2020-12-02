import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import os from 'os';
import _ from 'lodash';
import { fileURLToPath } from 'url';
import { beforeAll } from '@jest/globals';
import load from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fixturesDirpath = path.join(__dirname, '__fixtures__');
const testResultDirpath = path.join(os.tmpdir(), 'page-loader-tests');
const readFile = (baseDir, filename, encoding = 'utf-8') => fs.readFile(path.join(baseDir, filename), encoding);
let currentTestDir;
let testNum = 1;
let expectedHtml;
let srcHtml;
let srcHtml2;
let textAsset;
let imageAsset;

beforeAll(async () => {
  await fs.rmdir(testResultDirpath, { recursive: true }).catch(_.noop);
  await fs.mkdir(testResultDirpath);

  const promises = [
    readFile(fixturesDirpath, 'page.html'),
    readFile(fixturesDirpath, 'page2.html'),
    readFile(fixturesDirpath, 'result.html'),
    readFile(fixturesDirpath, '123.css'),
    readFile(fixturesDirpath, 'pogey.png', null),
  ];
  [srcHtml, srcHtml2, expectedHtml, textAsset, imageAsset] = await Promise.all(promises);

  nock('https://fakeaddress.com')
    .get('/')
    .reply(200, srcHtml);

  nock('https://fakeaddress.com')
    .get('/files/123.css')
    .reply(200, textAsset);

  nock('https://fakeaddress.com')
    .get('/pogey.png')
    .reply(200, imageAsset);

  nock('https://fakeaddress2.com')
    .get('/')
    .reply(200, srcHtml2);

  nock('https://fakeaddress3.com')
    .get('/')
    .reply(200, '');

  nock('https://unknownurl.com')
    .get('/')
    .reply(404, '');
});

beforeEach(async () => {
  currentTestDir = path.join(testResultDirpath, `test${testNum}`);
  await fs.mkdir(currentTestDir);
  testNum += 1;
});

test('load and save a page with assets', async () => {
  await load('https://fakeaddress.com/', currentTestDir);

  const promises = [
    readFile(currentTestDir, 'fakeaddress-com.html'),
    readFile(currentTestDir, 'fakeaddress-com_files/fakeaddress-com-files-123.css'),
    readFile(currentTestDir, 'fakeaddress-com_files/fakeaddress-com-pogey.png', null),
    fs.readdir(path.join(currentTestDir, '')),
    fs.readdir(path.join(currentTestDir, 'fakeaddress-com_files')),
  ];

  const [
    resultHtml,
    resultTextAsset,
    resultImageAsset,
    dir1Files,
    dir2Files,
  ] = await Promise.all(promises);

  expect(resultHtml).toBe(expectedHtml);
  expect(resultTextAsset).toBe(textAsset);
  expect(resultImageAsset).toEqual(imageAsset);
  expect(dir1Files).toHaveLength(2);
  expect(dir2Files).toHaveLength(2);
});

test('load and save a page without assets', async () => {
  await load('https://fakeaddress2.com/', currentTestDir);
  const resultHtml = await readFile(currentTestDir, 'fakeaddress2-com.html');
  const dirFiles = await fs.readdir(currentTestDir);

  expect(resultHtml).toBe(srcHtml2);
  expect(dirFiles).toHaveLength(1);
});

test('errors', async () => {
  const promise1 = load('wrong url', testResultDirpath);
  await expect(promise1).rejects.toThrow('Invalid URL');

  const badPath = path.join(testResultDirpath, 'unknown');
  const promise2 = load('https://fakeaddress3.com', badPath);
  await expect(promise2).rejects.toThrow('ENOENT');

  const filepath = path.join(currentTestDir, 'fakeaddress3-com.html');
  const dirpath = path.join(currentTestDir, 'fakeaddress3-com_files');

  await fs.writeFile(filepath, '');
  const promise3 = load('https://fakeaddress3.com', currentTestDir);
  await expect(promise3).rejects.toThrow('already exists');

  await fs.unlink(filepath);
  await fs.mkdir(dirpath);
  const promise4 = load('https://fakeaddress3.com', currentTestDir);
  await expect(promise4).rejects.toThrow('already exists');

  const promise5 = load('https://unknownurl.com', currentTestDir);
  await expect(promise5).rejects.toThrow('404');
});
