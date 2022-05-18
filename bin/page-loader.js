#!/usr/bin/env node
import { program } from 'commander';
import { cwd } from 'process';
// eslint-disable-next-line import/extensions
import load from '../src/loader.js';

const run = async (url, options) => {
  try {
    const { output } = options;
    console.log(await load(url, output));
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
};

program
  .description('Site loader')
  .version('1.0.0')
  .arguments('<url>')
  .option('-o, --output <v>', 'output path', cwd())
  .action(run)
  .parse();
