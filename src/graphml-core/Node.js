/**
 * The basic container of a graphml node element.
 * Since subgraphs are contained within nodes in graphml, those components are also this class's responsibility.
 * @property {Array[String]} subgraphs - an Array of ids that indicates every subgraph that is an immediate child of this element
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Node.prototype = new GraphmlElement();
Node.prototype.constructor = Node;
function Node(id, shape, attributes) {
	this.subgraphs = [];
	GraphmlElement.call(this, id, shape, attributes);
}

/**
 * Retrieve all subgraphs attached to this element.
 * @returns {Array[String]} an Array of subgraph ids
 */
Node.prototype.getSubgraphs = function() {
	return this.subgraphs;
}

/**
 * Assign subgraphs to this element.
 * @returns {Boolean} always returns false
 */
Node.prototype.setSubgraphs = function(subgraphs) {
	// TODO: currently, not supported
	return false;
}

/**
 * na
 * @returns {Boolean} true, if this Node has subgraphs assigned to it; false, otherwise
 */
Node.prototype.hasSubgraphs = function() {
	return this.subgraphs.length > 0;
}

/**
 * Get basic valid attribute data from the node entity.
 * @override
 */
Node.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		
		var children = xml.children; // Check for subgraphs among this node's children
		var subs = this.subgraphs;
		for(var i = 0, j = children.length; i < j; i++) {
			if(children[i].tagName == "graph")
				subs.push( children[i].id );
		}
	}
	return attributes;
}

/**
 * Create an HTML component to represent this graphml element
 * @override
 */
Node.prototype.createElement = function(attr) {
	var container = GraphmlElement.prototype.createElement.call(this, attr);
	if(!attr)
		attr = this.getAttributes();
	
	var subgraphs = this.subgraphs;
	var j = subgraphs.length;
	if(j > 0) {
		for(var i = 0; i < j; i++) {
			var graph = document.createElement("div");
			graph.id = subgraphs[i];
			graph.className = "graph";
			container.appendChild(graph);
		}
	}
	
	return container;
}