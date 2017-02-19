#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    getopt = require('node-getopt');

var OboGraphViz = require('..').OboGraphViz

var opt = getopt.create([
    ['o' , 'outfile=PATH'         , 'path to output file'],
    ['t' , 'to=ARG'               , 'output type (png, dot)'],
    ['s' , 'stylesheet=PATH'      , 'path to json stylesheet'],
    ['S' , 'stylemap=ARG'         , 'stylemap object as stringified json on command line'],
    ['c' , 'compoundRelations=N+' , 'list of compound relations'],
    ['h' , 'help'                 , 'display this help message']
])              // create Getopt instance
.bindHelp()     // bind option 'help' to default action
.parseSystem(); // parse command line

function inputError(err) {
    throw new Error (err)
}

var styleMap = {}
var stylesheet = opt.options['stylesheet']
if (stylesheet) {
    var styledata = fs.readFileSync (stylesheet)
    styleMap = JSON.parse(styledata)
}
if (opt.options['stylemap']) {
    styleMap = JSON.parse(opt.options['stylemap'])
}

opt.argv.length || inputError ("You must specify a JSON obograph file")
var useDatabaseID = opt.options['database-id']

var compoundRelations = opt.options['compoundRelations'] || []

var text = ""
opt.argv.forEach (function (filename) {
    if (!fs.existsSync (filename))
        inputError ("File does not exist: " + filename)
    var data = fs.readFileSync (filename)
    //var og = require(filename);
    var og = JSON.parse(data)
    //console.log(OboGraphViz)
    var ogv = new OboGraphViz(og)
    dot = ogv.renderDot(compoundRelations, styleMap)

    var outfile = opt.options['outfile']
    var outfmt = opt.options['to']
    if (outfmt && outfmt == 'png') {
        var fn = '/tmp/foo.dot'
        fs.writeFileSync(fn, dot)
        var execSync = require('child_process').execSync;
        pngfile = outfile
        if (!pngfile) {
            pngfile = '/tmp/foo.png'
        }
        var cmd = 'dot '+fn+'  -Tpng -o ' + pngfile
        execSync(cmd);
        if (outfile) {
            console.log("File is here: "+outfile)
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

