/**
 * Create and populate the namespace.
 */
var classList = [
				"GraphmlElement.js",
				"Representation.js",
				"Graph.js",
				"Node.js",
				"Edge.js",
				"Hyperedge.js"
];
graphml_core = new GraphmlNamespace("http://graphml.graphdrawing.org/xmlns", { classList:classList });

/**
 * The entry point for setting up the nodes from their data.
 * The default graphml namespace does not have any special features or functions of its setup.
 * According to the documentation, the minimum requirements of the graphml datastructure is merely a "container" specification.
 * Implementation and visualization are entirely decided by other applications, using foreign namespaces.
 * @override
 */
graphml_core.setup = function(canvas, graph, xml, attributes) { }
