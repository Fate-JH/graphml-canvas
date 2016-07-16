/**
 * The basic container of a graphml node element.
 * Since subgraphs are contained within nodes in graphml, those components are also this class's responsibility.
 * @property {Graph} subgraph - a subgraph which is usually listed as a child of this element
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Node.prototype = new GraphmlElement();
Node.prototype.constructor = Node;
function Node(id, attributes) {
	GraphmlElement.call(this, id, attributes);
	this.subgraph = null;
}

/**
 * Retrieve any subgraph attached to this element.
 * @returns {Graph} the graph assigned under this element, if any
 */
Node.prototype.getSubgraph = function() {
	return this.subgraph;
}

/**
 * Assign subgraphs to this element.
 * @param {Graph} graph - na
 * @returns {Graph} the old graph assigned under this element, if any
 */
Node.prototype.setSubgraph = function(graph) {
	var oldGraph = this.subgraph;
	if(oldGraph)
		oldGraph.setParent(null);
	this.subgraph = graph;
	graph.setParent(this);
	return oldGraph;
}

/**
 * Is this Node the parent of a subgraph?
 * @returns {Boolean} true, if this Node has subgraphs assigned to it; false, otherwise
 */
Node.prototype.hasSubgraph = function() {
	return !!this.subgraph;
}

/**
 * Create an HTML component to represent this graphml element
 * @override
 */
Node.prototype.createElement = function(attr) {
	var container = GraphmlElement.prototype.createElement.call(this, attr);
	
	var subgraph = this.subgraph;
	if(subgraph) {
		var graph = document.createElement("div");
		graph.id = subgraph.getId();
		graph.className = "graph";
		container.appendChild(graph);
	}
	return container;
}