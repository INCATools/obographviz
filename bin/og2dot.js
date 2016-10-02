#!/usr/bin/env node

var fs = require('fs'),
    path = require('path'),
    getopt = require('node-getopt');

var OboGraphViz = require('..').OboGraphViz

var opt = getopt.create([
    ['s' , 'stylesheet=PATH'      , 'path to json stylesheet'],
    ['S' , 'stylemap=ARG'      , 'path to json stylesheet'],
    ['c' , 'compoundRelations=N+'      , 'list of compound relations'],
    ['h' , 'help'             , 'display this help message']
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
    console.log(OboGraphViz)
    var ogv = new OboGraphViz(og)
    dot = ogv.renderDot(compoundRelations, styleMap)

    console.log(dot)
})

