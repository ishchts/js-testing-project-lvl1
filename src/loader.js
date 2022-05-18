import axios from 'axios';
import cheerio from 'cheerio';
import { join, parse, dirname } from 'path';
import { writeFile, mkdir } from 'fs/promises';
import debug from 'debug';

const log = debug('page-loader');

let baseUrl;
let basePath;

const toFileName = (uri) => {
  const url = new URL(uri);
  const ext = parse(url.pathname).ext || '.html';
  const fileName = [url.host, url.pathname.replace(ext, '')]
    .filter((el) => el !== '/')
    .join('')
    .replace(/\W/g, '-');

  return [fileName, ext].join('');
};

const saveToFile = async (filePath, content) => {
  try {
    await writeFile(filePath, content);
    log('file %s saved', filePath);
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    await mkdir(dirname(filePath), { recursive: true });
    await saveToFile(filePath, content);
  }
};

const toResource = (url) => ({
  originUrl: url,
  url: new URL(url, new URL(baseUrl).origin),
  filePath: undefined,
});

const resourceIsLocal = (resource) => new URL(baseUrl).host === resource.url.host;

const loadResource = async (resource) => {
  const { data: content } = await axios.get(resource.url.href, { responseType: 'arraybuffer' });
  const filePath = join(toFileName(baseUrl).replace('.html', '_files'), toFileName(resource.url.href));
  await saveToFile(join(basePath, filePath), content);
  return { ...resource, filePath };
};

const loadResources = async (getResourceUrls, replaceContent) => {
  const resources = getResourceUrls()
    .map((url) => toResource(url))
    .filter((resource) => resourceIsLocal(resource));

  const loadedResources = await Promise.all(resources.map(
    async (resource) => loadResource(resource),
  ));
  loadedResources.forEach((resource) => replaceContent(resource));
};

export default async (url, path = '') => {
  baseUrl = url;
  basePath = path;
  const { data: content } = await axios.get(baseUrl);
  const $ = cheerio.load(content);

  const imgs = loadResources(
    () => $('img').map((i, el) => $(el).attr('src')).toArray(),
    (resource) => $(`img[src="${resource.originUrl}"]`).attr('src', resource.filePath),
  );

  const scripts = loadResources(
    () => $('script').map((i, el) => $(el).attr('src')).toArray(),
    (resource) => $(`script[src="${resource.originUrl}"]`).attr('src', resource.filePath),
  );

  const links = loadResources(
    () => $('link').map((i, el) => $(el).attr('href')).toArray(),
    (resource) => $(`link[href="${resource.originUrl}"]`).attr('href', resource.filePath),
  );

  await Promise.all([imgs, scripts, links]);

  const filepath = join(basePath, toFileName(baseUrl));
  await saveToFile(filepath, $.html());
  return { filepath };
};
