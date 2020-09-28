import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import os from 'os';
import _ from 'lodash';
import debug from 'debug';
import load from '../src/index.js';

const nockLog = debug('page-loader:nock-log');

const fixturesDirpath = path.join(__dirname, '__fixtures__');
const testResultDirpath = path.join(os.tmpdir(), 'page-loader-tests');
const readFile = (baseDir, filename, encoding = 'utf-8') => fs.readFile(path.join(baseDir, filename), encoding);

beforeEach(async () => {
  await fs.rmdir(testResultDirpath, { recursive: true }).catch(_.noop);
  await fs.mkdir(testResultDirpath);
});

test('load and save a page with assets', async () => {
  const promises = [
    readFile(fixturesDirpath, 'page.html'),
    readFile(fixturesDirpath, 'result.html'),
    readFile(fixturesDirpath, '123.css'),
    readFile(fixturesDirpath, 'pogey.png', null),
  ];
  const [srcHtml, expectedHtml, textAsset, imageAsset] = await Promise.all(promises);
  const test1Dirpath = path.join(testResultDirpath, 'test1');
  await fs.mkdir(test1Dirpath);

  nock('https://fakeaddress.com')
    .log(nockLog)
    .get('/')
    .reply(200, srcHtml);

  nock('https://fakeaddress.com')
    .log(nockLog)
    .get('/files/123.css')
    .reply(200, textAsset);

  nock('https://fakeaddress.com')
    .log(nockLog)
    .get('/pogey.png')
    .reply(200, imageAsset);

  await load('https://fakeaddress.com/', test1Dirpath);

  const promises2 = [
    readFile(test1Dirpath, 'fakeaddress-com.html'),
    readFile(test1Dirpath, 'fakeaddress-com_files/files-123.css'),
    readFile(test1Dirpath, 'fakeaddress-com_files/pogey.png', null),
    fs.readdir(path.join(test1Dirpath, '')),
    fs.readdir(path.join(test1Dirpath, 'fakeaddress-com_files')),
  ];

  const [
    resultHtml,
    resultTextAsset,
    resultImageAsset,
    dir1Files,
    dir2Files,
  ] = await Promise.all(promises2);

  expect(resultHtml).toBe(expectedHtml);
  expect(resultTextAsset).toBe(textAsset);
  expect(resultImageAsset).toEqual(imageAsset);
  expect(dir1Files).toHaveLength(2);
  expect(dir2Files).toHaveLength(2);
});

test('load and save a page without assets', async () => {
  const srcHtml = await readFile(fixturesDirpath, 'page2.html');
  const test2Dirpath = path.join(testResultDirpath, 'test2');
  await fs.mkdir(test2Dirpath);

  nock('https://fakeaddress2.com')
    .log(nockLog)
    .get('/')
    .reply(200, srcHtml);

  await load('https://fakeaddress2.com/', test2Dirpath);
  const resultHtml = await readFile(test2Dirpath, 'fakeaddress2-com.html');
  const dirFiles = await fs.readdir(test2Dirpath);

  expect(resultHtml).toBe(srcHtml);
  expect(dirFiles).toHaveLength(1);
});

test('errors', async () => {
  const func = () => load('wrong url', testResultDirpath);
  expect(func).toThrow('Invalid URL');

  nock('https://fakeaddress3.com')
    .log(nockLog)
    .get('/')
    .reply(200, '');

  const badPath = path.join(testResultDirpath, 'unknown');
  const promise = load('https://fakeaddress3.com', badPath);
  await expect(promise).rejects.toThrow('ENOENT');

  const test3Dirpath = path.join(testResultDirpath, 'test3');
  await fs.mkdir(test3Dirpath);
  const filepath = path.join(test3Dirpath, 'fakeaddress3-com.html');
  const dirpath = path.join(test3Dirpath, 'fakeaddress3-com_files');

  await fs.writeFile(filepath, '');
  const promise2 = load('https://fakeaddress3.com', test3Dirpath);
  await expect(promise2).rejects.toThrow('already exists');
  await fs.unlink(filepath);
  await fs.mkdir(dirpath);

  const promise3 = load('https://fakeaddress3.com', test3Dirpath);
  await expect(promise3).rejects.toThrow('already exists');

  nock('https://unknownurl.com')
    .log(nockLog)
    .get('/')
    .reply(404, '');

  const promise4 = load('https://unknownurl.com', test3Dirpath);
  await expect(promise4).rejects.toThrow('404');
});
