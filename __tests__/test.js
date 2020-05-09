import path from 'path';
import { promises as fs } from 'fs';
import nock from 'nock';
import os from 'os';
import _ from 'lodash';
import load from '../src/index.js';

const getFixturePath = (fixtureName) => path.join(__dirname, `__fixtures__/${fixtureName}`);
const readFixture = (fixtureName) => fs.readFile(getFixturePath(fixtureName), 'utf-8');

beforeEach(async () => {
  await fs.unlink(path.join(os.tmpdir(), 'fakeaddress-com.html')).catch(_.noop);
});

test('load and save a page', async () => {
  const expectedHtml = await readFixture('page.html');
  nock('https://fakeaddress.com')
    .log(console.log)
    .get('/')
    .reply(200, expectedHtml);

  await load('https://fakeaddress.com', os.tmpdir());
  const result = await fs.readFile(path.join(os.tmpdir(), 'fakeaddress-com.html'), 'utf-8');
  expect(result).toBe(expectedHtml);
});
