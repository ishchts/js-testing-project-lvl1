import { promises as fs } from 'fs';
import axios from 'axios';
import { URL } from 'url';
import _ from 'lodash';
import path from 'path';
import cheerio from 'cheerio';
import debug from 'debug';

import { urlToDirname, urlToFilename } from './utils';

const log = debug('page-loader');

const attributeMapping = {
  link: 'href',
  script: 'src',
  img: 'src',
};

const prepareAssets = (website, baseDirname, html) => {
  const $ = cheerio.load(html, { decodeEntities: false });
  const assets = [];
  Object.entries(attributeMapping).forEach(([tagName, attrName]) => {
    const $elements = $(tagName).toArray();
    const elementsWithUrls = $elements.map((element) => $(element))
      .filter(($element) => $element.attr(attrName))
      .map(($element) => ({ $element, url: new URL($element.attr(attrName), website) }))
      .filter(({ url }) => url.origin === website);

    elementsWithUrls.forEach(({ $element, url }) => {
      const slug = urlToFilename(`${url.hostname}${url.pathname}`);
      const filepath = path.join(baseDirname, slug);
      assets.push({ url, filename: slug });
      $element.attr(attrName, filepath);
    });
  });

  return { html: $.html(), assets };
};

const downloadAsset = (dirname, { url, filename }) => (
  // Все данные качаются как бинарные, это позволяет одинаково качать и картинки и текст
  // Скачка и сохранение ускоряют процесс. Можно сначала все скачать, а потом все сохранять,
  // но это не эффективно. Тут это важно, потому что данные качаются медленно.
  axios.get(url.toString(), { responseType: 'arraybuffer' })
    .then((response) => {
      const fullPath = path.join(dirname, filename);
      return fs.writeFile(fullPath, response.data);
    })
);

export default (pageUrl, outputDirname = '') => {
  log('url', pageUrl);
  log('output', outputDirname);
  const url = new URL(pageUrl);
  const slug = `${url.hostname}${url.pathname}`;
  const filename = urlToFilename(slug);
  const fullOutputDirname = path.resolve(process.cwd(), outputDirname);
  const fullOutputFilename = path.join(fullOutputDirname, filename);
  const assetsDirname = urlToDirname(slug);
  const fullOutputAssetsDirname = path.join(fullOutputDirname, assetsDirname);

  let data;
  const promise = axios.get(pageUrl)
    .then((response) => {
      data = prepareAssets(url.origin, assetsDirname, response.data);
      log('create (if not exists) directory for assets', fullOutputAssetsDirname);
      return fs.access(fullOutputAssetsDirname)
        .catch(() => fs.mkdir(fullOutputAssetsDirname));
    })
    .then(() => {
      log('write html file', fullOutputFilename);
      return fs.writeFile(fullOutputFilename, data.html);
    })
    .then(() => {
      const tasks = data.assets.map((asset) => {
        log('asset', asset.url.toString(), asset.filename);
        return downloadAsset(fullOutputAssetsDirname, asset).catch(_.noop);
      });
      return Promise.all(tasks);
    })
    .then(() => ({ filepath: fullOutputFilename }));

  return promise;
};
