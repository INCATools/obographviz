/*
 * Translate OBOGraphs and BBOP-Graphs to Dot/Graphviz
 */

var _ = require('lodash');
var fp = require('lodash/fp');
var fs = require('fs');
var Graph = require("graphlib").Graph,
    dot = require("graphlib-dot"),
    BbopGraph = require('bbop-graph')

module.exports = OboGraphViz;

/**
 * Constructor for OboGraphViz renderer
 * 
 * @param {object} - OBO Graph JSON object
 */
function OboGraphViz(og) {
    this._og = og
    if (!og.graphs) {
        this._og = {graphs: [og]}
    }
    this._bbopg = this.createBbopGraph()
}

/**
 *
 * Convenience method: Given a dot string, write a dot file and any number of derived image formats (e.g. png)
 * 
 * (Requires child_process, will not work in browser. Use Viz.js instead)
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
        var exec = require('child_process').exec;
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
 * @param {list} - list of node Ids to highlight
 * @returns {string} dot object
 */
OboGraphViz.prototype.renderDot = function(nestedRelations, styleMap, highlightIds) {
    if (!styleMap) {
        styleMap = {}
    }
    if (!highlightIds) {
        if (styleMap.highlightIds) {
            highlightIds = styleMap.highlightIds;
        }
        else {
            highlightIds = []
        }
    }
    var dotgraph = this.createDigraph(nestedRelations, styleMap, highlightIds);
    return dot.write(dotgraph);
}

// we use bbop-graphs as the internal representation
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
 * Translate an OBO Graph JSON object into a graphlib object.
 * 
 * Note that the two graphs are not necessarily isomorphic;
 * the graphlib object corresponds to the DOT object.
 * 
 * The translation will trun some relations (compound relations)
 * into nested clusters
 * 
 */
OboGraphViz.prototype.createDigraph = function(nestedRelations, styleMap, highlightIds) {
    // TODO: adapt to use bbop-graph rather than direct JSON structure of obograph;
    // currently an odd mix
    var og = this._og
    var bg = this._bbopg

    // we use the Graph module to represent the *display* graph.
    // note this may differ from the source data graph;
    //  - containment relations
    //  - properties to be fed to dot
    var dotgraph = new Graph({ directed: true, compound: true, multigraph: true });

    // containment relations are cool!
    var nestedRelationsDirect = nestedRelations.
        filter(function(r) {return r.indexOf });
    var nestedRelationsInverse = nestedRelations.
        filter(function(r) {return !r.indexOf }).
        map(function(r) { return r.inverseOf });
    
    // iterate through all source graph objects and add to dotgraph
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

            // labelFrom means fetch the label by following an edge
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

            // use the bbop graph 'lbl' property for the label
            var label = nodeForLabel.lbl
            if (label) {
                if (styleMap && styleMap.includeIdInLabel && label != n.id) {
                    label = n.id + ' ' + label;
                }
                // many ontology class labels are long;
                // turn spaces into whitespace
                label = label.replace(/ /g,"\\n")
            }
            else {
                // default to id if no label present
                label = nodeForLabel.id
            }
            if (styleMap.displayAnnotations) {
                if (nodeForLabel.meta && nodeForLabel.meta.basicPropertyValues) {
                    for (let pv of nodeForLabel.meta.basicPropertyValues) {
                        console.log("PV="+pv.pred+" in "+styleMap.displayAnnotations);
                        if (styleMap.displayAnnotations.indexOf(pv.pred) >= 0 ) {
                            label += "\n" + pv.pred + " : " + pv.val;
                        }
                    }
                }
            }
            
            labelById[n.id] = label;

            nodeProperties = {
                label: label,
                shape: "box",
                font: "helvetica"
            }

            // highlight this node
            if (highlightIds.indexOf(nodeForLabel.id) > -1) {
                nodeProperties.penwidth = 10
            }

            showFields = []
            if (this.isSelected(n, styleMap)) {
                addStyles(nodeProperties, styleMap)
                if (styleMap.focusNodes && styleMap.focusNodes.indexOf(n.id) > -1) {
                    // highlight this node
                    if (styleMap.focus) {
                        var lm = styleMap.focus
                        addStyles(nodeProperties, lm)
                    }
                }

                // apply any rules that apply to IDs
                // with a certain prefix.
                if (styleMap.prefixProperties) {
                    for (k in styleMap.prefixProperties) {
                        pfx = k;
                        // pfx should be of form "UBERON:"
                        if (!pfx.startsWith('http')) {
                            pfx = pfx + ":";
                        }
                        if (nodeForLabel.id.startsWith(pfx)) {
                            sm = styleMap.prefixProperties[k];
                            if (sm.fields) {
                                showFields = sm.fields;
                            }
                            addAllStyles(nodeProperties, sm);
                        }
                    }
                }

                // last, apply properties if boolean
                // query in styleMap is satisfied
                if (styleMap.conditionalProperties) {
                    for (k in styleMap.conditionalProperties) {
                        cp = styleMap.conditionalProperties[k];
                        if (testConditions(n, cp.conditions)) {
                            if (cp.properties.fields) {
                                showFields = cp.properties.fields;
                            }
                            addAllStyles(nodeProperties, cp.properties);
                        }
                    }
                }

                if (showFields.length > 0) {
                    nodeProperties['shape'] = 'record';
                    defn = "";
                    if (n.meta && n.meta.definition && n.meta.definition.val) {
                        defn = n.meta.definition.val;
                    }
                    defn = defn.replace(/\.\s*/g,"\\n");
                    defn = defn.replace(/\,\s*/g,"\\n");
                    nodeProperties['label'] = "{" + label + "|" + defn + "}";
                }
                dotgraph.setNode(nid, nodeProperties)
            }
        }
        
        // add all edges to the graphlib graph
        for (j=0; j<edges.length; j++) {
            var e = edges[j]
            var pred = e.pred
            var subj = e.subj || e.sub
            var obj = e.obj

            if (!this.isSelected(nodeById[subj], styleMap) ||
                !this.isSelected(nodeById[obj], styleMap)) {
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
                dotgraph.setParent(dsubj, dobj)
            }
            else if (nestedRelationsInverse.indexOf(pred) > -1) {
                // as above, other dir
                dotgraph.setParent(dobj, dsubj)
            }
            else {
                var predLabel = pred
                if (pred && labelById[pred]) {
                    predLabel = labelById[pred]
                }
                // TODO: human-readable labels for pred
                var edgeProperties = { label: predLabel }
                if (styleMap.relationProperties) {
                    relStyles = styleMap.relationProperties;
                    if (relStyles[pred]) {
                        addAllStyles(edgeProperties, relStyles[pred]);
                    }
                    
                }
                
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
                        edgeProperties.ltail = dsubj
                    }
                    
                    if (isClusterNode(obj)) {
                        to = getDisplayId(randomLeaf(obj, cgraph))
                        edgeProperties.lhead = dobj
                    }
                    dotgraph.setEdge(from, to, edgeProperties, ename)
                    
                    //var fromLeaf = getDisplayId(randomLeaf(subj, cgraph))
                    //var toLeaf = getDisplayId(randomLeaf(obj, cgraph))
                    //dotgraph.setEdge(fromLeaf, toLeaf, {ltail : dsubj, lhead: dobj, label: pred}, ename)
                }
                else {
                    // neither of the nodes is in the compound graph
                    dotgraph.setEdge(dsubj, dobj, edgeProperties, ename)
                }
            }
        }

        
    }
    return dotgraph;
}

// styleMap.nodeFilter can be set to elimate nodes from the graph
// filter = { prop1: val1, prop2: val2, ... }
// by default, all nodes are selected
OboGraphViz.prototype.isSelected = function(obj, styleMap) {
    if (!obj) {
        return false;
    }
    if (styleMap.types) {
        if (!(obj.type && styleMap.types.indexOf(obj.type.toLowerCase()) >= 0)) {
            return false;
        }
    }
    if (styleMap.exclude) {
        if (testConditions(obj, styleMap.exclude)) {
            return false;
        }
    }
    if (styleMap.include) {
        if (!testConditions(obj, styleMap.include)) {
            return false;
        }
    }
    if (styleMap.excludeSingletons) {
        bg = this._bbopg;
        if (bg.get_edges_by_subject(obj.id).length == 0 &&
            bg.get_edges_by_object(obj.id).length == 0) {
            return false;
        }
    }
    
    // TODO: deprecate nodeFilter
    filter = styleMap.nodeFilter;
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

// add selected propertes from client-provided styleMap into properties
function addStyles(properties, styleMap) {
    addStyle('fillcolor', properties, styleMap)
    addStyle('style', properties, styleMap)
    addStyle('penwidth', properties, styleMap)
    addStyle('color', properties, styleMap)
}

function testConditions(node, conditionMap) {
    matchesAll = true;
    for (p in conditionMap) {
        expected = conditionMap[p];
        if (p == 'subset') {
            inSubset = false
            if (node.meta && node.meta.subsets) {
                for (k in node.meta.subsets) {
                    s = node.meta.subsets[k]
                    if (s == expected || s.replace(/^http.*\#/, "") == expected) {
                        inSubset = true;
                        break;
                    }
                }
            }
            if (!inSubset) {
                return false;
            }
        }
        if (p == 'type') {
            if (node.type && node.type != expected) {
                return false;
            }
        }
        if (node[p] && node[p] != expected) {
            return false;
        }
    }
    return true;
}


RESERVED = {'fields': true};

function addAllStyles(properties, styleMap) {
    if (styleMap) {
        for (p in styleMap) {
            if (!RESERVED[p]) {
                properties[p] = styleMap[p];
            }
        }
    }
}

// add a property from client-provided styleMap into properties
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
