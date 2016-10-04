var _ = require('lodash');
var fp = require('lodash/fp');
var exec = require('child_process').exec;
var fs = require('fs');
var Graph = require("graphlib").Graph,
    dot = require("graphlib-dot"),
    BbopGraph = require('bbop-graph')

module.exports = OboGraphViz;

/**
 * Constructor for GraphViz rendered
 * 
 * @param {object} - OBO Graph JSON object
 */
function OboGraphViz(og) {
    this._og = og
    this._bbopg = this.createBbopGraph()
}

/**
 * Given a dot string, write a dot file and any number of derived image formats (e.g. png)
 * 
 * @param {string} - dot string (i.e. output of renderDot)
 * @param {list} - list of formats, or format singleton, e.g. ['png']
 */
OboGraphViz.prototype.writeRenderedToFiles = function(dot, basePath, fmts) {
    var df = basePath + ".dot"
    fs.writeFileSync(df, dot)
    if (!fmts.map) {
        fmts = [fmts]
    }
    fmts.map(function(fmt) {
        var imgf = basePath + "." + fmt
        exec('dot -Grankdir=BT -T'+fmt+' -o '+imgf+' '+df)
    });
}


/**
 * Translate an OBO Graph JSON object into a dot format string,
 * which can be visualized using graphviz
 * 
 * @param {list} - list of object property URIs to be used as containment relations
 * @param {object} - stylemap
 * @returns {string} dot object
 */
OboGraphViz.prototype.renderDot = function(nestedRelations, styleMap) {
    if (!styleMap) {
        styleMap = {}
    }
    var digraph = this.createDigraph(nestedRelations, styleMap);
    return dot.write(digraph);
}

OboGraphViz.prototype.createBbopGraph = function() {
    var bg = new BbopGraph.graph();
    var og = this._og
    og.graphs.map(function(g) {
        g.nodes.map(function(n) {
            var bn = new BbopGraph.node(n.id, n.lbl);
            bg.add_node(bn);
        })
        g.edges.map(function(e) {
            var be = new BbopGraph.edge(e.sub, e.obj, e.pred)
            bg.add_edge(be);
        })
    });
    return bg
}

/**
 * Translate an OBO Graph JSON object into a graphlib object, using
 * compound graphs in nestedRelations are specified
 *
 * TODO: adapt to use bbop-graph rather than direct JSON structure of obograph
 */
OboGraphViz.prototype.createDigraph = function(nestedRelations, styleMap) {
    var og = this._og
    var bg = this._bbopg
    var digraph = new Graph({ directed: true, compound: true, multigraph: true });

    var nestedRelationsDirect = nestedRelations.
        filter(function(r) {return r.indexOf });
    var nestedRelationsInverse = nestedRelations.
        filter(function(r) {return !r.indexOf }).
        map(function(r) { return r.inverseOf });
    console.log("NRs="+nestedRelationsDirect);
    console.log("NRsI="+nestedRelationsInverse);
    
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
            var subj = e.subj || e.sub // TODO
            if (nestedRelationsDirect.indexOf(pred) > -1) {
                cgraph.setEdge(subj, e.obj)
            }
            if (nestedRelationsInverse.indexOf(pred) > -1) {
                console.log("INV:"+e)
                cgraph.setEdge(e.obj, subj)
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

        var labelById = {}
        var nodeById = {}
        var propertiesById = {}

        // TODO - use bbop graph, no need to build an index
        for (j=0; j<nodes.length; j++) {
            var n = nodes[j]
            nodeById[n.id] = n
        }
        
        // add nodes to graphlib graph
        for (j=0; j<nodes.length; j++) {
            var n = nodes[j]

            // ID that is dot-compliant
            var nid = getDisplayId(n.id)

            var nodeForLabel = n
            
            if (styleMap && styleMap.labelFrom) {
                // a property that is used to lookup the label relative to node
                var labelFromPred = styleMap.labelFrom;
                //console.log("LOOKING UP BY:"+labelFromPred+" "+n.id)
                    
                var parents = bg.get_edges_by_subject(n.id).filter(
                    function(e) {
                        return e.predicate_id() == labelFromPred
                    }).map(
                        function(e) {
                            var oid = e.object_id();
                            //console.log("  PARENT:"+oid)
                            if (!nodeById[oid]) {
                                console.log("  UH OH"+oid)
                            }
                            //console.log("  :::"+nodeById[oid].lbl)
                            return nodeById[oid]
                        });
                if (parents.length > 0) {
                    //console.log("RE-SETTING :"+n.id+" PARENTS: "+parents)
                    nodeForLabel = parents[0] // TODO - what if >1?
                }
                else {
                    //console.log("PARENT NOT FOUND FOR "+n.id)
                }
            }

            
            var label = nodeForLabel.lbl
            if (label) {
                label = label.replace(/ /g,"\\n")
            }
            else {
                label = nodeForLabel.id
            }
            labelById[n.id] = label

            properties = {
                label: label,
                shape: "box",
                font: "helvetica"
            }
            propertiesById[n.id] = properties;

            if (this.isSelected(n, styleMap.nodeFilter)) {
                addStyles(properties, styleMap)
                if (styleMap.focusNodes && styleMap.focusNodes.indexOf(n.id) > -1) {
                    // highlight this node
                    if (styleMap.focus) {
                        var lm = styleMap.focus
                        addStyles(properties, lm)
                    }
                }
            
                digraph.setNode(nid, properties)
            }
        }
        
        // add all edges to the graphlib graph
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            var subj = e.subj || e.sub
            var obj = e.obj

            if (!this.isSelected(nodeById[subj], styleMap.nodeFilter) ||
                !this.isSelected(nodeById[obj], styleMap.nodeFilter)) {
                continue;
            }
            
            // display ids - see above
            var dsubj = getDisplayId(subj)
            var dobj = getDisplayId(obj)

            // in graphlib multigraphs, edges should be given
            // names to distinguish between them
            var ename = subj + pred + obj

            // our strategy for determining edges depends on whether the relation
            // is in the set of relations that should be nested
            if (nestedRelationsDirect.indexOf(pred) > -1) {
                // the edge is not explicitly showed - instead the subject and
                // object form a parent-child relationship
                digraph.setParent(dsubj, dobj)
            }
            else if (nestedRelationsInverse.indexOf(pred) > -1) {
                // as above, other dir
                console.log("INV:"+dobj+" "+dsubj)
                digraph.setParent(dobj, dsubj)
            }
            else {
                var predLabel = pred
                if (pred && labelById[pred]) {
                    predLabel = labelById[pred]
                }
                // TODO: human-readable labels for pred
                var properties = { label: predLabel }
                
                // edge is an explicit edge.
                // there are two scenarios here
                //  1. either or both the nodes on the edge are containers in a compound graph
                //  2. neither is a container, in which case we add a normal edge
                if (cgraph.hasNode(subj)) {
                    // one of the nodes is in the compound graph
                    
                    var from = dsubj
                    var to = dobj
                    if (isClusterNode(subj)) {
                        from = getDisplayId(randomLeaf(subj, cgraph))
                        properties.ltail = dsubj
                    }
                    
                    if (isClusterNode(obj)) {
                        to = getDisplayId(randomLeaf(obj, cgraph))
                        properties.lhead = dobj
                    }
                    digraph.setEdge(from, to, properties, ename)
                    
                    //var fromLeaf = getDisplayId(randomLeaf(subj, cgraph))
                    //var toLeaf = getDisplayId(randomLeaf(obj, cgraph))
                    //digraph.setEdge(fromLeaf, toLeaf, {ltail : dsubj, lhead: dobj, label: pred}, ename)
                }
                else {
                    // neither of the nodes is in the compound graph
                    digraph.setEdge(dsubj, dobj, properties, ename)
                }
            }
        }

        
    }
    return digraph;
}

OboGraphViz.prototype.isSelected = function(obj, filter) {
    if (!obj) {
        return false;
    }
    if (!filter) {
        return true;
    }
    var isSelected = true;
    for (k in filter) {
        if (obj[k] && obj[k] != filter[k]) {
            isSelected = false;
        }
    }
    return isSelected;
}

function addStyles(properties, lm) {
    addStyle('fillcolor', properties, lm)
    addStyle('style', properties, lm)
    addStyle('penwidth', properties, lm)
}

function addStyle(p, properties, styleMap) {
    if (styleMap && styleMap[p]) {
        properties[p] = styleMap[p]
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
