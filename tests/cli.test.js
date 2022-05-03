var assert = require('chai').assert;

describe('cli', function () {
    it ('should produce correct stdout for simple-oj.json', function (done) {
        // execa is a pure ESM package! this can become a standard import when
        // this package is also declared as a module
        import('execa').then(function (mod) {
            const execa = mod.execa
            execa('bin/og2dot.js', ['tests/simple-og.json']).then(function (ret) {
                expectedOutput = `digraph {
  right_hand [label="right-hand",shape=box,font=helvetica,style=filled]
  right_forelimb [label="right-forelimb",shape=box,font=helvetica,style=filled]
  hand [label=hand,shape=box,font=helvetica,style=filled]
  limb [label=limb,shape=box,font=helvetica,style=filled]
  left_forelimb [label="left-forelimb",shape=box,font=helvetica,style=filled]
  forelimb [label=forelimb,shape=box,font=helvetica,style=filled]
  left_hand [label="left-hand",shape=box,font=helvetica,style=filled]
  autopod [label=autopod,shape=box,font=helvetica,style=filled]
  hand -> autopod [label="rdfs:subClassOf"]
  left_hand -> hand [label="rdfs:subClassOf"]
  left_hand -> left_forelimb [label=part_of]
  left_forelimb -> forelimb [label="rdfs:subClassOf"]
  hand -> forelimb [label=part_of]
  right_hand -> right_forelimb [label=part_of]
  right_hand -> hand [label="rdfs:subClassOf"]
  forelimb -> limb [label="rdfs:subClassOf"]
  autopod -> limb [label=part_of]
  right_forelimb -> forelimb [label="rdfs:subClassOf"]
}
`;
                assert.equal(ret.stdout, expectedOutput);
                done();
            });
        });
    });
});
