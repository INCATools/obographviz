var Graph = require("graphlib").Graph,
    dot = require("graphlib-dot");

module.exports = renderDot;

function renderDot(og, nestedRelations, styleMap) {

    var digraph = og_to_graphlib(og, nestedRelations, styleMap);
    return dot.write(digraph);
}


function og_to_graphlib(og, nestedRelations, styleMap) {
    var digraph = new Graph({ directed: true, compound: true, multigraph: true });

    for (i=0; i<og.graphs.length; i++) {
        var g = og.graphs[i]

        var nodes = g.nodes
        var edges = g.edges

        // compound graph
        var cgraph = new Graph({ directed: true });

        // first make subgraphs
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            if (nestedRelations.indexOf(pred) > -1) {
                cgraph.setEdge(e.subj, e.obj)
            }
        }

        var getDisplayId = function(id) {
            var isCluster = false
            cns = cgraph.predecessors(n.id)
            if (cns != null && cns.length > 0) {
                isCluster = true
            }
            var nid = safeId(n.id)
            if (isCluster) {
                nid = clusterId(nid)
            }
            return nid
        }

        var displayIdMap = {}
        for (j=0; j<nodes.length; j++) {
            var n = nodes[j]
            var isCluster = false
            cns = cgraph.predecessors(n.id)
            if (cns != null && cns.length > 0) {
                isCluster = true
            }
            var nid = safeId(n.id)
            if (isCluster) {
                nid = clusterId(nid)
            }
            displayIdMap[n.id] = nid
            //displayIdMap[n.id] = n.id)
        }
        
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            var subj = e.subj
            var obj = e.obj

            var dsubj = displayIdMap[subj]
            var dobj = displayIdMap[obj]
            var ename = subj + pred + obj
            if (nestedRelations.indexOf(pred) > -1) {
                digraph.setParent(dsubj, dobj)
            }
            else {
                if (cgraph.hasNode(e.subj)) {
                    var fromLeaf = displayIdMap[randomLeaf(subj, cgraph)]
                    var toLeaf = displayIdMap[randomLeaf(obj, cgraph)]
                    digraph.setEdge(fromLeaf, toLeaf, {ltail : dsubj, lhead: dobj, label: pred}, ename)
                }
                else {
                    digraph.setEdge(dsubj, dobj, {label: pred}, ename)
                }
            }
        }
        
        for (j=0; j<nodes.length; j++) {
            var n = nodes[j]
            if (n.type == 'CLASS') {
                var nid = displayIdMap[n.id]
                digraph.setNode(nid, {label: n.lbl})
            }
        }
        
    }
    return digraph;
}

function randomLeaf(n, g) {
    cns = g.predecessors(n)
    if (cns == null || cns.length == 0) {
        return n
    }
    else {
        return randomLeaf(cns[0], g)
    }
}

function safeId(uri) {
    return uri.replace(/[^a-zA-Z0-9_]/g,"_")
}

function clusterId(id) {
    return "cluster_" + safeId(id);
}
