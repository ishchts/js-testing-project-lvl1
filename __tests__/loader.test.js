import nock from 'nock';
import { join } from 'path';
import { tmpdir } from 'os';
import { readFile, mkdtemp } from 'fs/promises';

import pageLoader from '../src/loader';

const readFixture = async (...paths) => readFile(join(__dirname, '..', '/__fixtures__', ...paths), 'utf-8');

beforeEach(() => {
  nock.disableNetConnect();
});

afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

describe('positive cases', () => {
  const resources = ['nodejs.png', 'script.js', 'application.css'];
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

    const readResult = await readFile(result.filepath, 'utf-8');

    expect(result).toEqual({ filepath: join(path, 'ru-hexlet-io-courses.html') });
    expect(readResult).toEqual(loadedHtml);
  });
});

describe('negative cases', () => {
  test.each([404, 500])('server %s error', (code) => {
    nock('https://site.com').get('/path').reply(code);
    return expect(pageLoader('https://site.com/path')).rejects.toThrow();
  });

  test('access error', async () => {
    const html = await readFixture('simple-site.html');
    nock('https://site.com').get('/path').reply(200, html);
    return expect(pageLoader('https://site.com/path', '/sys')).rejects.toThrow();
  });
});
