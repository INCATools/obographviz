
var fs = require('fs');
var assert = require('chai').assert;
var OboGraphViz = require('..').OboGraphViz;
var exec = require('child_process').exec;

describe('test viz', function(){

    var og = null
    

    it('render check', function(){
        var dirs = fs.readdirSync ('./tests/').filter(function(n){return n.indexOf(".json") > -1})
        console.log("DIRS="+dirs)
        dirs.map(render);
    });
    
});

function render(f) {
    var data = fs.readFileSync ('./tests/' + f);
    var basePath = f.replace(".json","");
    console.log("Processing: "+basePath)
    var crs = [""];
    var styleMap = {}
                 
    if (basePath == 'simple-og') {
        crs = ["is_a"]
    }
    if (basePath.indexOf('lego') > -1) {
        styleMap = {
            nodeFilter : {
                "type" : "INDIVIDUAL"
            }
        }
    }
    og = JSON.parse(data);
    var ogv = new OboGraphViz(og);
    var dot = ogv.renderDot(crs, styleMap);
    writeImage(dot, 'examples/'+basePath);
}

function writeImage(dot, basePath) {
    console.log("Rendering: "+basePath)
    var df = basePath + ".dot";
    var imgf = basePath + ".png";
    fs.writeFileSync(df, dot);
    exec('dot -Grankdir=BT -Tpng -o '+imgf+' '+df)
}
