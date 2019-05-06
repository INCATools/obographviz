
var fs = require('fs');
var assert = require('chai').assert;
var OboGraphViz = require('..').OboGraphViz;
var CliqueIndex = require('..').CliqueIndex;
var exec = require('child_process').exec;

describe('test equiv', function(){
    var data = fs.readFileSync ('./tests/equivs.json');
    og = JSON.parse(data);
    var ogv = new OboGraphViz(og);
    cx = new CliqueIndex();
    console.log(og.equivalentNodesSets);
    cliques = cx.findMaximalCliques(ogv._equivalentNodesSets);
    console.log("CLIQUES="+cliques);
    
});

