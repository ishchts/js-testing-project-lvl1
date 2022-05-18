#!/usr/bin/env node

import program from 'commander';

import loader from '../src/loader';

program
  .description('Loads page')
  .arguments('<pageUrl>')
  .option('-o, --output [path]', 'choose output path', process.cwd())
  .action(async (pageUrl, options) => {
    console.log(await loader(pageUrl, options.output));
  })
  .parse(process.argv);

if (!program.args.length) program.help();
