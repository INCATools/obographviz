function Clique() {
}

Clique.prototype.setMembers = function(nids) {
    this._nids = Array.from(new Set(nids)).sort();
    this.id = this._nids.join('|');
}

function CliqueIndex() {
    this._cliques = []
    this._nodeToCliqueMap = {}
    
}

CliqueIndex.prototype.findMaximalCliques = function(equivalentNodesSets) {
    this._cliques = [];
    this._nodeToCliquesMap = {};

    for (let nset of equivalentNodesSets) {
        const nids = nset.nodeIds;
        const clique = new Clique();
        clique.setMembers(nids);
        this._cliques.push(clique);
        for (let nid of nids) {
            if (!this._nodeToCliquesMap[nid]) {
                this._nodeToCliquesMap[nid] = [];
            }
            this._nodeToCliquesMap[nid].push(clique);
        }
    }

    let isSaturated = false;
    while (!isSaturated) {
        isSaturated = true;

        iteration: {
            const cliques = this._cliques;
            const nodeToCliquesMap = this._nodeToCliquesMap;
            //console.log("CLIQUES: "+cliques.length+ " // "+cliques.map(x => x.id));
            for (let c of cliques) {
                const cid = c.id;
                //console.log("  CLIQUE: "+cid+" HAS: "+c._nids);
                for (let n of c._nids) {
                    //console.log("    N: "+n+" HAS: "+nodeToCliquesMap[n].map(x=>x.id));
                    for (let c2 of nodeToCliquesMap[n]) {
                        if (c2.id != c.id) {
                            //console.log("        MERGING "+c2.id+" INTO "+c.id);
                            this.merge(c2, c);
                            isSaturated = false;
                            break iteration;
                        }
                    }
                }
            }
        }
    }
    
    return this._cliques.map(x => x._nids);
}

CliqueIndex.prototype.merge = function(srcClique, tgtClique) {
    for (let n of srcClique._nids) {
        this._nodeToCliquesMap[n] = this._nodeToCliquesMap[n].filter(c => c.id != srcClique.id).concat(tgtClique);
    }
    tgtClique.setMembers(srcClique._nids.concat(tgtClique._nids));
    this._cliques = this._cliques.filter(x => x.id != srcClique.id);

}

export default CliqueIndex;