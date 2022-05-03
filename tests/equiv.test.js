
var fs = require('fs');
var assert = require('chai').assert;
var OboGraphViz = require('..').OboGraphViz;
var CliqueIndex = require('..').CliqueIndex;
var exec = require('child_process').exec;

describe('test equiv', function(){

    it('finds correct cliques', function () {
        var data = fs.readFileSync ('./tests/equivs.json');
        og = JSON.parse(data);
        var ogv = new OboGraphViz(og);
        cx = new CliqueIndex();
        console.log(og.equivalentNodesSets);
        cliques = cx.findMaximalCliques(ogv._equivalentNodesSets);
        console.log("CLIQUES="+cliques);
        assert.equal(cliques, 'W_3,X_3,Y_3,Z_3,W_1,X_1,Y_1,Z_1,W_2,X_2,Y_2,Z_2')
    });
    
});

