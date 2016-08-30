var Graph = require("graphlib").Graph,
    dot = require("graphlib-dot");

module.exports = renderDot;

/**
 * Translate an OBO Graph JSON object into a dot format string,
 * which can be visualized using garphviz
 * 
 * @param {object} - OBO Graph JSON object
 * @param {list} - list of object property URIs to be used as containment relations
 * @param {object} - stylemap
 */
function renderDot(og, nestedRelations, styleMap) {
    if (!styleMap) {
        styleMap = {}
    }
    var digraph = og_to_graphlib(og, nestedRelations, styleMap);
    return dot.write(digraph);
}

/**
 * Translate an OBO Graph JSON object into a graphlib object, using
 * compound graphs in nestedRelations are specified
 */
function og_to_graphlib(og, nestedRelations, styleMap) {
    var digraph = new Graph({ directed: true, compound: true, multigraph: true });

    // iterate through all graph objects
    for (i=0; i<og.graphs.length; i++) {
        var g = og.graphs[i]

        var nodes = g.nodes
        var edges = g.edges

        // create a compound graph object, consisting of all
        // edges with preds in the nestedRelations list
        var cgraph = new Graph({ directed: true });
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            if (nestedRelations.indexOf(pred) > -1) {
                cgraph.setEdge(e.subj, e.obj)
            }
        }

        // tests if a node is a clusternode (it is a container
        // of other nodes)
        var isClusterNode = function(id) {
            var isCluster = false
            cns = cgraph.predecessors(id)
            if (cns != null && cns.length > 0) {
                isCluster = true
            }
            return isCluster
        }

        // for correct display of compound graphs, all
        // containers must have an id that starts 'container_'
        var getDisplayId = function(id) {
            var isCluster = isClusterNode(id)
            var nid = safeId(id)
            if (isCluster) {
                nid = clusterId(nid)
            }
            return nid
        }

        // add all edges to the graphlib graph
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            var subj = e.subj
            var obj = e.obj

            // display ids - see above
            var dsubj = getDisplayId(subj)
            var dobj = getDisplayId(obj)

            // in graphlib multigraphs, edges should be given
            // names to distinguish between them
            var ename = subj + pred + obj

            // our strategy for determining edges depends on whether the relation
            // is in the set of relations that should be nested
            if (nestedRelations.indexOf(pred) > -1) {
                // the edge is not explicitly showed - instead the subject and
                // object form a parent-child relationship
                digraph.setParent(dsubj, dobj)
            }
            else {
                // TODO: human-readable labels for pred
                var meta = { label: pred }
                
                // edge is an explicit edge.
                // there are two scenarios here
                //  1. either or both the nodes on the edge are containers in a compound graph
                //  2. neither is a container, in which case we add a normal edge
                if (cgraph.hasNode(e.subj)) {
                    // one of the nodes is in the compound graph
                    
                    var from = dsubj
                    var to = dobj
                    if (isClusterNode(subj)) {
                        from = getDisplayId(randomLeaf(subj, cgraph))
                        meta.ltail = dsubj
                    }
                    
                    if (isClusterNode(obj)) {
                        to = getDisplayId(randomLeaf(obj, cgraph))
                        meta.lhead = dobj
                    }
                    digraph.setEdge(from, to, meta, ename)
                    
                    //var fromLeaf = getDisplayId(randomLeaf(subj, cgraph))
                    //var toLeaf = getDisplayId(randomLeaf(obj, cgraph))
                    //digraph.setEdge(fromLeaf, toLeaf, {ltail : dsubj, lhead: dobj, label: pred}, ename)
                }
                else {
                    // neither of the nodes is in the compound graph
                    digraph.setEdge(dsubj, dobj, meta, ename)
                }
            }
        }

        // add nodes to graphlib graph
        for (j=0; j<nodes.length; j++) {
            var n = nodes[j]
            
            // TODO: do not hardcode this
            if (n.type == 'CLASS') {
                var nid = getDisplayId(n.id)
                var label = n.lbl
                label = label.replace(/ /g,"\n")

                meta = {
                    label: label,
                    shape: "box",
                    font: "helvetica"
                }
                addStyles(meta, styleMap)
                if (styleMap.focusNodes && styleMap.focusNodes.indexOf(n.id) > -1) {
                    // highlight this node
                    if (styleMap.focus) {
                        var lm = styleMap.focus
                        addStyles(meta, lm)
                    }
                }
                
                digraph.setNode(nid, meta)
            }
        }
        
    }
    return digraph;
}

function addStyles(meta, lm) {
    addStyle('fillcolor', meta, lm)
    addStyle('style', meta, lm)
    addStyle('penwidth', meta, lm)
}

function addStyle(p, meta, styleMap) {
    if (styleMap && styleMap[p]) {
        meta[p] = styleMap[p]
    }
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
