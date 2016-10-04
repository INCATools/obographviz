
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
    if (basePath.indexOf('so-example') > -1) {
        crs = ["http://purl.obolibrary.org/obo/so-xp.obo#member_of", "http://purl.obolibrary.org/obo/so-xp.obo#part_of"]
    }
    if (basePath.indexOf('lego') > -1) {
        styleMap = {
            nodeFilter : {
                "type" : "INDIVIDUAL"
            },
            labelFrom : "type"
        }
        //crs = ["http://purl.obolibrary.org/obo/BFO_0000050"]
        crs = ["http://purl.obolibrary.org/obo/BFO_0000050",
               {inverseOf: "http://purl.obolibrary.org/obo/RO_0002333"},  /// enabled by
               //{inverseOf: "http://purl.obolibrary.org/obo/RO_0002233"}, /// has input
               //{inverseOf: "http://purl.obolibrary.org/obo/BFO_0000066"},
              ]
    }
    og = JSON.parse(data);
    var ogv = new OboGraphViz(og);
    var dot = ogv.renderDot(crs, styleMap);
    ogv.writeRenderedToFiles(dot, 'examples/'+basePath, ["pdf"])
    //writeImage(dot, 'examples/'+basePath);
}

function writeImage(dot, basePath) {
    console.log("Rendering: "+basePath)
    var df = basePath + ".dot";
    var imgf = basePath + ".png";
    fs.writeFileSync(df, dot);
    exec('dot -Grankdir=BT -Tpng -o '+imgf+' '+df)
}
