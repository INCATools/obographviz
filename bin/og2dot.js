#!/usr/bin/env node

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { Command } from 'commander';
import { OboGraphViz } from '../dist/index.js';
import { execSync } from 'child_process'
import tmp from 'tmp';
import open from 'open';

// remove all controlled temporary objects on process exit
tmp.setGracefulCleanup();

function multiple(value, previous) {
    return previous.concat([value]);
}

const program = new Command();
program
    .name('og2dot')
    .description('Translate OBO Graphs into Dot/Graphviz')
    .argument('<files...>', 'JSON obograph files')
    .option('-o, --outfile <path>', 'path to output file')
    .option('-t, --to <type>', 'output type (png, dot)')
    .option('-s, --stylesheet <path>', 'path to json stylesheet')
    .option('-S, --stylemap <value>', 'stylemap object as stringified json on command line')
    .option('-H, --highlight <nodes>', 'node to highlight (can be specified multiple times)', multiple, [])
    .option('-c, --compound-relations <relation>', 'compound relation (can be specified multiple times)', multiple, [])
    .option('-I, --compound-relations-inverse <relation>', 'inverted compound relation (can be specified multiple times)', multiple, [])
    .parse()

function inputError(err) {
    console.error(err)
    process.exit(1)
}

const options = program.opts()
var styleMap = {}
var stylesheet = options['stylesheet']
if (stylesheet) {
    var styledata = readFileSync (stylesheet)
    styleMap = JSON.parse(styledata)
}
if (options['stylemap']) {
    styleMap = Object.assign({}, styleMap, JSON.parse(options['stylemap']));
}

var compoundRelations = options['compoundRelations'] || []
if (options['compoundRelationsInverse']) {
    for (let x of options['compoundRelationsInverse']) {
        compoundRelations.push({inverseOf:x})
    }
}

program.args.forEach (function (filename) {
    if (!existsSync (filename)) {
        inputError ("File does not exist: " + filename)
    }
    var data = readFileSync (filename)
    //var og = require(filename);
    var og = JSON.parse(data)
    //console.log(OboGraphViz)
    var ogv = new OboGraphViz(og)
    const dot = ogv.renderDot(compoundRelations, styleMap, options['highlight'])

    var outfile = options['outfile']
    var outfmt = options['to']
    if (outfmt && outfmt == 'png') {
        let dotFile = tmp.fileSync({ postfix: '.dot' }).name;
        writeFileSync(dotFile, dot)
        var pngfile = outfile
        if (!pngfile) {
            pngfile = tmp.fileSync({ postfix: '.png', keep: true }).name;
        }
        var cmd = `dot ${dotFile} -Grankdir=BT -Tpng -o ${pngfile}`;
        execSync(cmd);
        if (!outfile) {
            console.log("Opening " + pngfile);
            open(pngfile);
        }
    }
    else {
        if (outfile) {
            writeFileSync(outfile, dot)
        }
        else {
            console.log(dot)
        }
    }
})

