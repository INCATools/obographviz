# Translate OBO Graphs into Dot/Graphviz

 * Input: a [OBO Graph JSON](https://github.com/geneontology/obographs) object
 * Optional: a JSON ontology stylesheet
 * Output: a Dot-format / Graphviz file

Quickstart (command line):

```
./bin/og2dot.js tests/simple-og.json > test.dot
dot test.dot -Tpng -Grankdir=BT > test.png
```

Command line; from [python obographs package](https://github.com/biolink/biolink-api/tree/master/obographs)

```
ogr -p subClassOf BFO:0000050 -r obo:go -t png g nucleus
```

API:

```
 var compoundRelations = ['BFO:0000050']
 var styleMap = {}
 var gv = new ogv.OboGraphViz(result.data)
 var dot = gv.renderDot(compoundRelations, styleMap)
```

# Features

## Nesting

One or more predicates can be designated as 'compound', i.e. used for nesting.

On the command line, use `-c`. In the API, use `compoundRelations`

Example:

```
./bin/og2dot.js -c is_a tests/simple-og.json > test.dot
```

Generates:

![img](examples/nested-example.png)

Note only works for subgraphs that exhibit disjointness over this property, acyclicity

## Stylesheets

In the API can be passed using `styleMap`. On the command line, by using either `-s` (to pass a JSON file) or `-S` (to pass stringified JSON object directly on command line)

E.g.

```
./bin/og2dot.js -s examples/example-style.json -c is_a tests/simple-og.json > test.dot
```

## Rendering anonymous and pseudo-anonymous individuals

E.g. LEGO models

```
{
 nodeFilter : {
                "type" : "INDIVIDUAL"
              },
              labelFrom : "type"
}
```

# Integration with other components

## Obographs python

See:

https://github.com/biolink/biolink-api/tree/master/obographs

(note: this python API may move to its own repo in future)

obographs-python command line:

```
ogr -p subClassOf BFO:0000050 -r go -t png   a nucleus
```

This proceeds by:

 1. Using the python obographs library to extract a networkx subgraph around the specified node
 2. Write as obographs-json
 3. Calls og2dot.js

## Use from biolink-api REST

Go to http://api.monarchinitiative.org/api/

See the `/ontol/subgraph/` route

This exports obographs which can be fed in to this js lib

TODO - link to demo site

## Use with AmiGO

AmiGO uses bbop-graphs; these are similar enough that they can be passed in instead of obographs.

# Blether

## Why Dot/GraphViz?

Why not D3, cytoscape js etc?

These are all very nice and pretty, but GraphViz has some powerful
features that I have not found in any other framework (or have been
too lazy to find out how to do). In particular:

 * Easy to run on command line
 * The ability to _nest_ relationships (update: compound graphs in cytoscape.js)
 * simple control over box and edge visual attributes
 * embedding arbitrary HTML

This is intended to replace blipkit graphviz generation. For some
examples, see [mondo report](https://github.com/monarch-initiative/monarch-disease-ontology/blob/master/reports/genes/ABCC9.md)



