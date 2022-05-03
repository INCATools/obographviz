#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Command } = require('commander');

var OboGraphViz = require('..').OboGraphViz

function multiple(value, previous) {
    return previous.concat([value]);
}

const program = new Command();
program
    .name('og2dot')
    .description('Translate OBO Graphs into Dot/Graphviz')
    .option('-o, --outfile <path>', 'path to output file')
    .option('-t, --to <type>', 'output type (png, dot)')
    .option('-s, --stylesheet <path>', 'path to json stylesheet')
    .option('-S, --stylemap <value>', 'stylemap object as stringified json on command line')
    .option('-H, --highlight <nodes>', 'node to highlight (can be specified multiple times)', multiple, [])
    .option('-c, --compound-relations <relation>', 'compound relation (can be specified multiple times)', multiple, [])
    .option('-I, --compound-relations-inverse <relation>', 'inverted compound relation (can be specified multiple times)', multiple, [])
    .parse()

function inputError(err) {
    throw new Error (err)
}

const options = program.opts()
var styleMap = {}
var stylesheet = options['stylesheet']
if (stylesheet) {
    var styledata = fs.readFileSync (stylesheet)
    styleMap = JSON.parse(styledata)
}
if (options['stylemap']) {
    styleMap = Object.assign({}, styleMap, JSON.parse(options['stylemap']));
}

program.args.length || inputError ("You must specify a JSON obograph file")
var useDatabaseID = options['database-id']

var compoundRelations = options['compoundRelations'] || []
if (options['compoundRelationsInverse']) {
    for (let x of options['compoundRelationsInverse']) {
        compoundRelations.push({inverseOf:x})
    }
}

var text = ""
program.args.forEach (function (filename) {
    if (!fs.existsSync (filename))
        inputError ("File does not exist: " + filename)
    var data = fs.readFileSync (filename)
    //var og = require(filename);
    var og = JSON.parse(data)
    //console.log(OboGraphViz)
    var ogv = new OboGraphViz(og)
    dot = ogv.renderDot(compoundRelations, styleMap, options['highlight'])

    var outfile = options['outfile']
    var outfmt = options['to']
    if (outfmt && outfmt == 'png') {
        var fn = '/tmp/foo.dot'
        fs.writeFileSync(fn, dot)
        var execSync = require('child_process').execSync;
        pngfile = outfile
        if (!pngfile) {
            pngfile = '/tmp/foo.png'
        }
        var cmd = 'dot '+fn+' -Grankdir=BT -Tpng -o ' + pngfile
        execSync(cmd);
        if (outfile) {
            //console.log("File is here: "+outfile)
            // do nothing - already output
        }
        else {
            console.log("Opening "+pngfile);
            execSync('open '+pngfile);
        }
    }
    else {
        if (outfile) {
            fs.writeFileSync(outfile, dot)
        }
        else {
            console.log(dot)
        }
    }
})

