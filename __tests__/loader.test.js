import nock from 'nock';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, mkdtemp } from 'fs/promises';

import pageLoader from '../src/loader';

const readFixture = async (...paths) => readFile(join(__dirname, '..', '/__fixtures__', ...paths), 'utf-8');
/*
nock.disableNetConnect();
(async () => {
  const resources = ['img.png'];
  const siteHtml = await readFixture('site.html');
  nock('https://ru.hexlet.io').get('/courses').reply(200, siteHtml);
  await Promise.all(resources.map(async (resource) => {
    const content = await readFixture(resource);
    nock('https://ru.hexlet.io').get(`/${resource}`).reply(200, content);
  }));

  await pageLoader('https://ru.hexlet.io/courses', '/var/tmp');
})();
*/

beforeEach(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('positive cases', () => {
  const resources = ['nodejs.png'];
  let path;

  beforeEach(async () => {
    path = await mkdtemp(join(tmpdir(), 'page-loader-'));
    const siteHtml = await readFixture('site.html');

    nock('https://ru.hexlet.io').get('/courses').reply(200, siteHtml);
    await Promise.all(resources.map(async (resource) => {
      const content = await readFixture(resource);
      nock('https://ru.hexlet.io').get(`/${resource}`).reply(200, content);
    }));
  });

  test('loader', async () => {
    const loadedHtml = await readFixture('expected', 'site.html');
    const result = await pageLoader('https://ru.hexlet.io/courses', path);
    const readResult = await readFile(result, 'utf-8');

    expect(result).toEqual(join(path, 'ru-hexlet-io-courses.html'));
    expect(readResult).toEqual(loadedHtml);
  });
});
