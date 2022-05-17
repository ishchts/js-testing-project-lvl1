import nock from 'nock';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, mkdtemp } from 'fs/promises';

import pageLoader from '../src/loader';

const readFixture = async (...paths) => readFile(join(__dirname, '..', '/__fixtures__', ...paths), 'utf-8');

describe('positive cases', () => {
  let path;
  beforeEach(async () => {
    nock.disableNetConnect();
    path = await mkdtemp(join(tmpdir(), 'page-loader-'));
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  test('loader', async () => {
    const siteHtml = await readFixture('site.html');
    nock('https://ru.hexlet.io').get('/courses').reply(200, siteHtml);

    const file = await readFile(await pageLoader('https://ru.hexlet.io/courses', path), 'utf-8');
    console.log('siteHtml', siteHtml);
    console.log('path', path);
    expect(file).toEqual(siteHtml);
  });
});
