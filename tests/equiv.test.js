import { readFileSync } from 'fs';
import { assert } from 'chai';
import { OboGraphViz, CliqueIndex } from '../lib/index.js';

describe('test equiv', function(){

    it('finds correct cliques', function () {
        var data = readFileSync ('./tests/equivs.json');
        const og = JSON.parse(data);
        var ogv = new OboGraphViz(og);
        const cx = new CliqueIndex();
        console.log(og.equivalentNodesSets);
        const cliques = cx.findMaximalCliques(ogv._equivalentNodesSets);
        console.log("CLIQUES="+cliques);
        assert.equal(cliques, 'W_3,X_3,Y_3,Z_3,W_1,X_1,Y_1,Z_1,W_2,X_2,Y_2,Z_2')
    });
    
});

