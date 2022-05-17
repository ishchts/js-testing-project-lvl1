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

export default async (url, path = '') => {
  baseUrl = url;
  basePath = path;
  const { data: content } = await axios.get(baseUrl);
  const $ = cheerio.load(content);

  const filePath = join(basePath, toFileName(baseUrl));
  await saveToFile(filePath, $.html());
  return filePath;
};
