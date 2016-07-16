/**
 * The basic container of a graphml graph element.
 * @property {Object[Node]} nodes - a mapping of the Node ids that are contained by this graph
 * @property {Object[Edge]} edges - a mapping of the Edge ids that are contained by this graph
 * @property {Object[Hyperedge]} hyperedges - a mapping of the Hyperedge ids that are contained by this graph
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Graph.prototype = new GraphmlElement();
Graph.prototype.constructor = Graph;
function Graph(id, attributes) {
	GraphmlElement.call(this, id, attributes);
	this.nodes = {};
	this.edges = {};
	this.hyperedges = {};
	this.bounds = {
		left:null,
		top:null,
		right:null,
		bottom:null
	};
}

/**
 * Determine whether this graph is the/a root graph.
 * A node<parent>-graph<this> combination does not as <this> being the root graph.
 * @return {Boolean} true, if we have no parent; false, otherwise
 */
Graph.prototype.isRoot = function() {
	return !this.getParent();
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
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Object} a live mapping of all of the nodes
 */
Graph.prototype.getNodes = function(deep) {
	var outNodes = {};
	var nodes = this.nodes;
	for(var id in nodes)
		outNodes[id] = nodes[id];
	
	if(deep) {
		var subs = this.getSubgraphs();
		for(var sid in subs) {
			nodes = subs[sid].getNodes(deep);
			for(var id in nodes)
				outNodes[id] = nodes[id];
		}
	}
	return outNodes;
}

/**
 * Get a Node element in this graph from its id.
 * @param {String} id - the specific id of the node.
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Node} a Node element
 */
Graph.prototype.getNode = function(id, deep) {
	var nodes = this.nodes;
	var outNode = nodes[id];
	
	if(!outNode && deep) {
		var len = (this.isRoot() ? "" : this.getId().split("::")).length;
		var wantId = id.split("::");
		wantId.splice(len+1, wantId.length); // wantId.length is merely a sufficiently big number
		wantId = wantId.join("::");
		var wantNode = nodes[wantId]; // Want the subgraph of the next node in the address
		if(!wantNode)
			return null;
		var wantSubgraph = wantNode.getSubgraph();
		outNode = wantSubgraph ? wantSubgraph.getNode(id, deep) : null;
	}
	return outNode;
}

/**
 * Set a new Array of Node element ids for this Graph structure.
 * @param {Object} nodes - a mapping of Node element ids to nodes
 * @returns {Object} a mapping of all of the previous Node element ids to nodes
 */
Graph.prototype.setNodes = function(nodes) {
	var displacedNodes = {};
	var oldNodes = this.nodes;
	for(var id in oldNodes)
		displacedNodes[id] = this.removeNode(id);

	if(nodes) {
		for(var id in nodes)
			this.addNode(id, nodes[id]);
	}
	return displacedNodes;
}

/**
 * Assign a new Node element id to this Graph element
 * @param {String} id - a new Node element id
 * @param {Node} node - a new Node element
 * @returns {Boolean} true, if the new Node element is added; false, otherwise
 */
Graph.prototype.addNode = function(id, node) {
	id = id || node.getId();
	var nodes = this.nodes;
	for(var nid in nodes) {
		if(nid == id)
			return false;
	}
	nodes[id] = node;
	node.setParent(this);
	return true;
}

/**
 * Remove an existing Node element id from this Graph element
 * @param {String} id - a Node element id
 * @returns {Node} the Node previous associated with id, or null if there never was any
 */
Graph.prototype.removeNode = function(id) {
	var nodeOut = this.nodes[id];
	if(nodeOut)
		nodeOut.setParent(null);
	delete this.nodes[id];
	return nodeOut;
}

/**
 * Get all of the Edge element ids contained by this Graph element.
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Array[String]} a live mapping of all of the edges
 */
Graph.prototype.getEdges = function(deep) {
	var outEdges = {};
	var edges = this.edges;
	for(var id in edges)
		outEdges[id] = edges[id];
	
	if(deep) {
		var subs = this.getSubgraphs();
		for(var sid in subs) {
			edges = subs[sid].getEdges(deep);
			for(var id in edges)
				outEdges[id] = edges[id];
		}
	}
	return outEdges;
}

/**
 * Get an Edge element in this graph from its id.
 * @param {String} id - the specific id of the edge
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Edge} an Edge element
 */
Graph.prototype.getEdge = function(id, deep) {
	var edges = this.edges;
	var outEdge = edges[id];
	
	if(!outEdge && deep) {
		var len = (this.isRoot() ? "" : this.getId().split("::")).length;
		var wantId = id.split("::");
		wantId.splice(len+1, wantId.length); // wantId.length is merely a sufficiently big number
		wantId = wantId.join("::");
		var wantNode = this.nodes[wantId]; // Want the subgraph of the next node in the address
		if(!wantNode)
			return null;
		var wantSubgraph = wantNode.getSubgraph();
		outEdge = wantSubgraph ? wantSubgraph.getEdge(id, deep) : null;
	}
	return outEdge;
}

/**
 * Set a new Array of Edge element ids for this Graph structure.
 * @param {Object} edges - a mapping of Node element ids to edges
 * @returns {Object} a mapping of all of the previous Edge element ids to edges
 */
Graph.prototype.setEdges = function(edges) {
	var displacedEdges = {};
	var oldEdges = this.edges;
	for(var id in oldEdges)
		displacedEdges[id] = this.removeEdge(id);

	if(edges) {
		for(var id in edges)
			this.addEdge(id, edges[id]);
	}
	return displacedEdges;
}

/**
 * Assign a new Edge element id to this Graph element
 * @param {String} id - a new Edge element id
 * @param {Edge} edge - a new Edge element
 * @returns {Boolean} true, if the new Edge element is added; false, otherwise
 */
Graph.prototype.addEdge = function(id, edge) {
	id = id || node.getId();
	var edges = this.edges;
	for(var eid in edges) {
		if(eid == id)
			return false;
	}
	edges[id] = edge;
	edge.setParent(this);
	return true;
}

/**
 * Remove an existing Edge element id from this Graph element
 * @param {String} id - an Edge  element id
 * @returns {Edge} the Edge previous associated with id, or null if there never was any
 */
Graph.prototype.removeEdge = function(id) {
	var edgeOut = this.edges[id];
	if(edgeOut)
		edgeOut.setParent(null);
	delete this.edges[id];
	return edgeOut;
}

/**
 * Get all of the Hyperedge element ids contained by this Graph element.
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Array[String]} a live mapping of all of the hyperedges
 */
Graph.prototype.getHyperedges = function(deep) {
	var outEdges = {};
	var hyperedges = this.hyperedges;
	for(var id in hyperedges)
		outEdges[id] = hyperedges[id];
	
	if(deep) {
		var subs = this.getSubgraphs();
		for(var sid in subs) {
			hyperedges = subs[sid].getHyperedges(deep);
			for(var id in hyperedges)
				outEdges[id] = hyperedges[id];
		}
	}
	return outEdges;
}

/**
 * Get a Hyperedge element in this graph from its id.
 * @param {String} id - the specific id of the hyperedge
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Hyperedge} a Hyperedge element
 */
Graph.prototype.getHyperedge = function(id, deep) {
	var hyperedges = this.hyperedges;
	var outEdge = hyperedges[id];
	
	if(!outEdge && deep) {
		var len = (this.isRoot() ? "" : this.getId().split("::")).length;
		var wantId = id.split("::");
		wantId.splice(len+1, wantId.length); // wantId.length is merely a sufficiently big number
		wantId = wantId.join("::");
		var wantNode = this.nodes[wantId]; // Want the subgraph of the next node in the address
		if(!wantNode)
			return null;
		var wantSubgraph = wantNode.getSubgraph();
		outEdge = wantSubgraph ? wantSubgraph.getHyperedge(id, deep) : null;
	}
	return outEdge;
}

/**
 * Set a new Array of Hyperedge element ids for this Graph structure.
 * @param {Object} hyperedges - a mapping of Hyperedge element ids to edges
 * @returns {Object} a mapping of all of the previous Hyperedge element ids to hyperedges
 */
Graph.prototype.setHyperedges = function(hyperedges) {
	var displacedEdges = {};
	var oldEdges = this.hyperedges;
	for(var id in oldEdges)
		displacedEdges[id] = this.removeHyperedge(id);

	if(hyperedges) {
		for(var id in hyperedges)
			this.addHyperedge(id, hyperedges[id]);
	}
	return displacedEdges;
}

/**
 * Assign a new Hyperedge element id to this Graph element
 * @param {String} id - a new Hyperedge element id
 * @param {Hyperedge} hyperedge - a new Hyperedge element
 * @returns {Boolean} true, if the new Hyperedge element is added; false, otherwise
 */
Graph.prototype.addHyperedge = function(id, hyperedge) {
	id = id || node.getId();
	var hyperedges = this.hyperedges;
	for(var hid in hyperedges) {
		if(id == hid)
			return false;
	}
	hyperedges[id] = hyperedge;
	hyperedge.setParent(this);
	return true;
}

/**
 * Remove an existing Hyperedge element id from this Graph element
 * @param {String} id - a Hyperedge element id
 * @returns {Hyperedge} the Hyperedge previous associated with id, or null if there never was any
 */
Graph.prototype.removeHyperedge = function(id) {
	var edgeOut = this.hyperedges[id];
	if(edgeOut)
		edgeOut.setParent(null);
	delete this.hyperedges[id];
	return edgeOut;
}

/**
 * Get all of the Graph element ids contained by this Graph element (subgraphs).
 * @param {Boolean} deep - optional; recursive subgraph search (get all nested subgraphs rather than just the local ones)
 * @returns {Object} a live mapping of all of the Graph element ids to graphs
 */
Graph.prototype.getSubgraphs = function(deep) {
	var outGraphs = {};
	var nodes = this.nodes;
	for(var id in nodes) {
		var sub = nodes[id].getSubgraph()
		if(sub) {
			outGraphs[sub.getId()] = sub;
			if(deep) {
				var graphs = sub.getSubgraphs(deep);
				for(var id in graphs)
					outGraphs[id] = graphs[id];
			}
		}
	}
	return outGraphs;
}

/**
 * Get a subgraph element in this graph from its id.
 * @param {String} id - the specific id of the subgraph
 * @param {Boolean} deep - optional; recursive subgraph search (check all nested subgraphs rather than just the local ones)
 * @returns {Graph} a Graph element
 */
Graph.prototype.getSubgraph = function(id, deep) {
	var subgraphs = this.getSubgraphs();
	var outGraph = subgraphs[id]
	
	if(!outGraph && deep) {
		var len = (this.isRoot() ? "" : this.getId().split("::")).length;
		var wantId = id.split("::");
		wantId.splice(len+1, wantId.length); // wantId.length is merely a sufficiently big number
		wantId = wantId.join("::");
		var wantNode = this.nodes[wantId]; // Want the subgraph of the next node in the address
		if(!wantNode)	
			return null;
		var wantSubgraph = wantNode.getSubgraph();
		outGraph = wantSubgraph ? wantSubgraph.getSubgraph(id, deep) : null;
	}
	return outGraph;
}

/**
 * Set a new mapping of Graph element ids to graphs for this Graph structure.
 * @param {Object} subgraphs - a mapping of Graph element ids to graphs
 * @returns {Object} always return an empty object
 */
Graph.prototype.setSubgraphs = function(subgraphs) {
	console.log("Graph.setSubgraphs does not do anything.");
	return {};
}

/**
 * Assign a new subgraph element id to this Graph element
 * @param {String} id - a new Graph element id
 * @param {Hyperedge} subgraph - a new Graph element
 * @returns {Boolean} true, if the new Graph element is added; false, otherwise
 */
Graph.prototype.addSubgraph = function(id, subgraph) {
	console.log("Graph.addSubgraph does not do anything.");
	return false;
}

/**
 * Remove an existing subgraph element id from this Graph element
 * @param {String} id - a Graph element id
 * @returns {Graph} the Graph previous associated with id, or null if there never was any
 */
Graph.prototype.removeSubgraph = function(id) {
	console.log("Graph.removeSubgraph does not do anything.");
	return {};
}

/**
 * Get the Graph element that contains this graph.
 * @returns {Graph} the containing Graph, or null if this is already the root
 */
Graph.prototype.getSupergraph = function() {
	var node = this.getParent();
	if(!node)
		return null;
	return node.getParent();
}

/**
 * Set the Graph element that contains this graph.
 * @returns {Graph} always returns null
 */
Graph.prototype.setSupergraph = function() {
	console.log("Graph.setSupergraph does not do anything.");
	return null;
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