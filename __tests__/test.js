import path from 'path';
import fs from 'fs';
import nock from 'nock';
import os from 'os';
import _ from 'lodash';
import load from '../src/index.js';

const getFixturePath = (fixtureName) => path.join(__dirname, `__fixtures__/${fixtureName}`);
const readFixture = (fixtureName) => fs.readFile(getFixturePath(fixtureName), 'utf-8');

beforeEach(async () => {
  await fs.unlink(path.join(os.tmpdir(), 'fakeadress-com.html')).catch(_.noop);
});

test('load and save a page', async () => {
  const data = await readFixture('page.html');
  nock('https://fakeadress.com')
    .log(console.log)
    .get('/')
    .reply(200, data);

  await load('https://fakeaddress.com', os.tmpdir());
  const result = await fs.readFile(path.join(os.tmpdir(), 'fakeadress-com.html'));
  expect(result).toBe(data);
});
