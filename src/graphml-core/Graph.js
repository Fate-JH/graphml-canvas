/**
 * The basic container of a graphml graph element.
 * @property {Object[Node]} nodes - a mapping of the Node ids that are contained by this graph
 * @property {Object[Edge]} edges - a mapping of the Edge ids that are contained by this graph
 * @property {Object[Hyperedge]} hyperedges - a mapping of the Hyperedge ids that are contained by this graph
 * @property {Object[Graph]} subgraphs - a mapping of subgraphs contained by this graph
 * @property {Graph} parentGraph - the Graph above this one, or null if we are the root parent Graph
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Function} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Graph.prototype = new GraphmlElement();
Graph.prototype.constructor = Graph;
function Graph(id, shape, attributes) {
	GraphmlElement.call(this, id, shape, attributes);
	this.nodes = {};
	this.edges = {};
	this.hyperedges = {};
	this.subgraphs = {};
	this.parentGraph = null;
	this.bounds = {
		left:null,
		top:null,
		right:null,
		bottom:null
	};
}

/**
 * na
 */
Graph.prototype.getParent = function() {
	return this.parentGraph;
}

/**
 * na
 */
Graph.prototype.setParent = function(parentGraph) {
	this.parentGraph = parentGraph;
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @override
 */
Graph.prototype.getBounds = function() {
	var boundsIn = this.bounds;
	var boundsOut = { };
	boundsOut.x = boundsIn.left ? boundsIn.left.getBounds().x : 0;
	boundsOut.y = boundsIn.top ? boundsIn.top.getBounds().y : 0;
	
	var boundsRight = boundsIn.right && boundsIn.right.getBounds();
	var boundsBottom = boundsIn.bottom && boundsIn.Bottom.getBounds();
	boundsOut.width = boundsIn.right ? (boundsRight.x + boundsRight.width - boundsOut.x) : 0;
	boundsOut.height = boundsIn.bottom ? (boundsBottom.y + boundsBottom.height - boundsOut.y) : 0;
	return boundsOut;
}

/**
 *
 */
Graph.prototype.addToGraphBounds = function(node) {
	var graphBounds = this.bounds;
	var graphBoundsLeft = graphBounds.left ? graphBounds.left.getBounds().x : Infinity;
	var graphBoundsTop = graphBounds.top ? graphBounds.top.getBounds().y : Infinity;
	var graphBoundsRight = graphBoundsLeft + graphBounds.right ? graphBounds.right.getBounds().width : -Infinity;
	var graphBoundsBottom = graphBoundsTop + graphBounds.bottom ? graphBounds.bottom.getBounds().height : -Infinity;
	var nodeBounds = node.getBounds();
	var nodeBoundsLeft = nodeBounds.x;
	var nodeBoundsTop = nodeBounds.y;
	var nodeBoundsRight = nodeBoundsLeft + nodeBounds.width;
	var nodeBoundsBottom = nodeBoundsTop + nodeBounds.height;
	
	if(nodeBoundsLeft < graphBoundsLeft)
		graphBounds.left = node;
	if(nodeBoundsTop < graphBoundsTop)
		graphBounds.top = node;
	if(nodeBoundsRight > graphBoundsRight)
		graphBounds.right = node;
	if(nodeBoundsBottom > graphBoundsBottom)
		graphBounds.bottom = node;
}

/**
 *
 */
Graph.prototype.removeFromGraphBounds = function(node) {
	var graphBounds = this.bounds;
	if(graphBounds.left == node) {
		// ...
	}
	if(graphBounds.top == node) {
		// ...
	}
	if(graphBounds.right == node) {
		// ...
	}
	if(graphBounds.bottom == node) {
		// ...
	}
}

/**
 * Get all of the Node element ids contained by this Graph element.
 * @returns {Array[String]} a live mapping of all of the nodes
 */
Graph.prototype.getNodes = function() {
	return this.nodes;
}

/**
 * Get a Node element in this graph from its id.
 * @returns {Node} a Node element
 */
Graph.prototype.getNode = function(id) {
	return this.nodes[id];
}

/**
 * Set a new Array of Node element ids for this Graph structure.
 * @param {Array[String]} nodes - a mapping of Node element ids to nodes
 * @returns {Array[String]} a mapping of all of the previous Node element ids to nodes
 */
Graph.prototype.setNodes = function(nodes) {
	var displacedNodes = this.nodes;
	this.nodes = nodes;
	return displacedNodes;
}

/**
 * Assign a new Node element id to this Graph element
 * @param {String} id - a new Node element id
 * @param {Node} node - a new Node element
 * @returns {Boolean} true, if the id is added; false, if it is already found and not added
 */
Graph.prototype.addNode = function(id, node) {
	id = id || node.getId();
	var nodes = this.nodes;
	for(var nid in nodes) {
		if(nid == id)
			return false;
	}
	
	nodes[id] = node;
	return true;
}

/**
 * Remove an existing Node element id from this Graph element
 * @param {String} id - a Node element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeNode = function(id) {
	var nodeOut = this.nodes[id];
	delete this.nodes[id];
	return !!nodeOut;
}

/**
 * Get all of the Edge element ids contained by this Graph element.
 * @returns {Array[String]} a live mapping of all of the edges
 */
Graph.prototype.getEdges = function() {
	return this.edges;
}

/**
 * Set a new Array of Edge element ids for this Graph structure.
 * @param {Object} nodes - a mapping of Edge element ids to edges
 * @returns {Object} a mapping of all of the previous Edge element ids to edges
 */
Graph.prototype.setEdges = function(edges) {
	this.edges = edges;
}

/**
 * Get an Edge element in this graph from its id.
 * @returns {Edge} an Edge element
 */
Graph.prototype.getEdge = function(id) {
	return this.edges[id];
}

/**
 * Assign a new Edge element id to this Graph element
 * @param {String} id - a new Edge element id
 * @param {Edge} edge - a new Edge element
 * @returns {Boolean} true, if the id is added; false, if it is already found and not added
 */
Graph.prototype.addEdge = function(id, edge) {
	id = id || node.getId();
	var edges = this.edges;
	for(var eid in edges) {
		if(eid == id)
			return false;
	}
	
	edges[id] = edge;
	return true;
}

/**
 * Remove an existing Edge element id from this Graph element
 * @param {String} id - an Edge element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeEdge = function(id) {
	var edgeOut = this.edges[id];
	delete this.edges[id];
	return !!edgeOut;
}

/**
 * Get all of the Hyperedge element ids contained by this Graph element.
 * @returns {Array[String]} a live mapping of all of the hyperedges
 */
Graph.prototype.getHyperedges = function() {
	return this.hyperedges;
}

/**
 * Set a new Array of Hyperedge element ids for this Graph structure.
 * @param {Array[String]} hyperedges - a mapping of Hyperedge element ids to edges
 * @returns {Array[String]} a mapping of all of the previous Hyperedge element ids to hyperedges
 */
Graph.prototype.setHyperedges = function(hyperedges) {
	this.hyperedges = hyperedges;
}

/**
 * Get a Hyperedge element in this graph from its id.
 * @returns {Hyperedge} a Hyperedge element
 */
Graph.prototype.getHyperedge = function(id) {
	return this.hyperedge[id];
}

/**
 * Assign a new Hyperedge element id to this Graph element
 * @param {String} id - a new Hyperedge element id
 * @param {Hyperedge} hyperedge - a new Hyperedge element
 * @returns {Boolean} true, if the id is added; false, if it is already found in the Array and not added
 */
Graph.prototype.addHyperedge = function(id, hyperedge) {
	id = id || node.getId();
	var hyperedges = this.hyperedges;
	for(var hid in hyperedges) {
		if(id == hid)
			return false;
	}
	
	hyperedges[id] = hyperedge;
	return true;
}

/**
 * Remove an existing Hyperedge element id from this Graph element
 * @param {String} id - a Hyperedge element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeHyperedge = function(id) {
	var edgeOut = this.hyperedges[id];
	delete this.hyperedges[id];
	return !!edgeOut;
}

/**
 * Get all of the Graph element ids contained by this Graph element (subgraphs).
 * @returns {Object} a live mapping of all of the Graph element ids to graphs
 */
Graph.prototype.getSubgraphs = function() {
	return this.subgraphs;
}

/**
 * Set a new mapping of Graph element ids to graphs for this Graph structure.
 * @param {Object} subgraphs - a mapping of Graph element ids to graphs
 * @returns {Object} a mapping of all of the previous Graph element ids to graphs
 */
Graph.prototype.setSubgraphs = function(subgraphs) {
	var oldSubgraph = this.subgraphs;
	this.subgraphs = subgraphs;
	return oldSubgraph;
}

/**
 * Get a specific Graph element contained by this Graph element.
 * @param {String} id - a Graph element id
 * @returns {Graph} a direct subgraph to this Graph
 */
Graph.prototype.getSubgraph = function(id) {
	return this.subgraphs[id];
}

/**
 * Set a specific Graph element to be contained by this Graph element.
 * @param {String} id - a Graph element id
 * @param {Graph} subgraph - a new Graph element
 * @returns {Graph} the previous subgraph associated with this id
 */
Graph.prototype.setSubgraph = function(id, subgraph) {
	id = id || ( subgraph ? (subgraph.getId ? subgraph.getId() : subgraph.id) : null);
	if(!id)
		throw new Error("Graph id must be defined to add or remove a new subgraph.");
	
	var subgraphs = this.subgraphs;
	var oldSubgraph = subgraphs[id];
	subgraphs[id] = subgraph;
	subgraph.setParent(this);
	return oldSubgraph;
}

/**
 * Assign a new Graph element id to this Graph element as a subgraph
 * @param {Subgraph} subgraph - a new Graph element
 * @returns {Boolean} true, if the id is added; false, if it is already found in the Array and not added
 */
Graph.prototype.addSubgraph = function(id, subgraph) {
	id = id || subgraph.getId();
	var graphs = this.subgraphs;
	for(var gid in graphs) {
		if(gid == id)
			return false;
	}
	
	graphs[id] = subgraph;
	subgraph.setParent(this);
	return true;
}

/**
 * Remove an existing Graph element id from this Graph element
 * @param {String} id - a new Graph element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeSubgraph = function(id) {
	var graphOut = this.subgraphs[id];
	delete this.subgraphs[id];
	return !!graphOut;
}

/**
 * Get basic valid attribute data from the edge entity.
 * @override
 */
Graph.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		if(!(attributes.edgedefault = xml.getAttribute("edgedefault"))) {
			console.log("The graph element '"+attributes.id+"' is not declaring a default edge direction; it will default to 'undirected'");
			attributes.edgedefault = "undirected";
		}
	}
	return attributes;
}