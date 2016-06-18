/**
 * Create and populate the namespace.
 */
graphml_default = new GraphmlNamespace("http://graphml.graphdrawing.org/xmlns");
graphml_default.setSpecificClass(null, this["Graph"]);
graphml_default.setSpecificClass(null, this["Node"]);
graphml_default.setSpecificClass(null, this["Edge"]);
graphml_default.setSpecificClass(null, this["Hyperedge"]);

/**
 * The entry point for setting up the nodes from their data.
 * The default graphml namespace does not have any special features or functions of its setup.
 * According to the documentation, the minimum requirements of the graphml datastructure is merely a "container" specification.
 * Implementation and visualization are entirely decided by other applications, using foreign namespaces.
 * @override
 */
graphml_default.setup = function(canvas, graph, xml, attributes) { }


/**
 * The base class that represents the pure graphml container of a graph element.
 * As an abstraction this class serves as a container for the Representation object.
 * This class should not need to be extended or modified unless the graphml schema changes.
 * @property {String} id - a unique identifier for this element
 * @property {Function|Object} representation - the optional, but recommended, behaviors that maintain the visual component of the element
 * @property {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 * @abstract
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Function} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
function GraphmlElement(id, shape, attributes) {
	this.id = id;
	this.representation = null;
	this.attributes = null;
	
	if(shape)
		this.setRepresentation(shape);
	if(attributes)
		this.readXML(attributes);
}

/**
 * Get the identifier of the graphml element.
 * @returns {String} an identifier
 */
GraphmlElement.prototype.getId = function() {
	return this.id;
}

/**
 * Provide a new identifier for the graphml element.
 * @param {String} id - an identifier
 * @returns {Boolean} always returns true
 */
GraphmlElement.prototype.setId = function(id) {
	this.id = id;
	// TODO: what to do if the representation was already created
	return true;
}

/**
 * Get the additional data that was included when the graphml element was created.
 * If the Representation of the element has been created, prioritize the data known to that object instead.
 * @returns {Object} the additional data
 */
GraphmlElement.prototype.getAttributes = function() {
	return this.attributes;
}

/**
 * Provide new additional data after the element exists.
 * @param {Object} attributes - the additional data
 * @returns {Object} any old additional data that we are replacing
 */
GraphmlElement.prototype.setAttributes = function(attributes) {
	var attr = this.attributes;
	this.attributes = attributes;
	return attr;
}

/**
 * Get the visualization of this element.
 * @return {Function|Object} if the visualization has not yet been created, will return the constructor; if the visualization has been created, will return that
 */
GraphmlElement.prototype.getRepresentation = function() {
	return this.representation;
}

/**
 * Assign the visualization of this element.
 * @param {Function} shape - the constructor of the visualization of the element
 * @returns {Boolean} true, if it was set correctly; false, otherwise
 */
GraphmlElement.prototype.setRepresentation = function(shape) {
	var typeOfShape = typeof(shape);
	if(!shape || typeOfShape != "function")
		return false;
	
	var representation = this.representation
	var typeOfRep = typeof(representation);
	if(representation) {
		if(typeOfRep == "object") {
			console.log("The representation of element "+this.id+" has already been created.  Replacing it is not supported at this time.");
			return false;
		}
	}
	
	this.representation = shape;
	this.buildRepresentation();
	return true;
}

/**
 * Build the prescribed representation.
 * If the representation has already been built, rebuild it.
 * Please note that the result is not dependent on whether a representation exists afterwards, but whether the building process succeeded.
 * @returns {Boolean} true, if the representation was capable of being built; false, otherwise
 */
GraphmlElement.prototype.buildRepresentation = function() {
	var attributes = this.attributes;
	var representation = this.representation;
	var func = representation;
	var workingRepresentation = representation && typeof(representation) == "object"; // typeof(null) == "object;" true story
	
	if(workingRepresentation) {
		attributes = representation.getAttributes();
		func = representation.constructor;
	}
	if(!attributes || !attributes.xml || !func)
		return false;
	
	var object = null;
	try {
		object = new func(this.id, attributes);
		this.representation = object;
	}
	catch(err) {
		if(!attributes.xml)
			console.log(this.constructor.name +" "+ this.id +" tried to parse xml data but there was no data");
		else if(!representation)
			console.log(this.constructor.name +" "+ this.id +" tried to parse xml data but could not build a working parser");
		else if(!object)
			console.log(this.constructor.name +" "+ this.id +" tried to parse xml data but could not build a "+representation.name+" visual representation");
		if(!workingRepresentation) // We failed to construct this Representation and it had not previously been constructed; discard it
			this.representation = null;
		return false;
	}
	return true;
}

/**
 * Get the name that describes the visualization of element (equivalent to the visualization's constructor).
 * @returns {String} the descriptor, or an empty string if no descriptor
 */
GraphmlElement.prototype.getRepresentationName = function() {
	if(this.representation) {
		if(typeof(this.representation) == "function")
			return this.representation.name;
		else
			return this.representation.constructor.name;
	}
	else
		return "";
}

/**
 * Provide an updated visualization name.
 * You should not be allowed to do this?
 * @param {String} a new visualization class name, in theory
 * @returns {String} always returns false
 */
GraphmlElement.prototype.setRepresentationName = function(shape) {
	return false;
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @returns {Object} o - an object that contains the coordinates and span
 * @returns {Number} o.x - the x-coordinate of the element's top-left corner ("left" in HTML)
 * @returns {Number} o.y - the y-coordinate of the element's top-left corner ("top" in HTML)
 * @returns {Number} o.width - the span called width
 * @returns {Number} o.height - the span called height
 */
GraphmlElement.prototype.getBounds = function() {
	var rep = this.representation;
	if(rep && typeof(rep) == "object")
		return rep.getBounds();
	else {
		return { x:0, y:0, width:0, height:0 }; 
	}
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @param {Object} bounds - an object that contains the coordinates and span
 * @param {Number} bounds.x - the x-coordinate of the element ("left" in HTML)
 * @param {Number} bounds.y - the y-coordinate of the element ("top" in HTML)
 * @param {Number} bounds.width - the span called width
 * @param {Number} bounds.height - the span called height
 * @returns {Boolean} always returns false
 */
GraphmlElement.prototype.setBounds = function(bounds) {
	return false;
}

/**
 * Accept and parse extended markup for the purposes of building this element's representation.
 * @param {Object} attributes - information pertinent to this function
 * @param {XML} attributes.xml - the markup data that explains this graphml element
 */
GraphmlElement.prototype.readXML = function(attributes) {
	attributes = attributes || {};
	var xml = attributes.xml;
	
	this.getGraphmlAttributes(xml, attributes);
	this.setAttributes(attributes);
	this.id = attributes.id;
	this.buildRepresentation();
}

/**
 * Get basic valid attribute data from the graphml entity.
 * The attributes collected by this method are, in general, the barebones requirement for a given graphml element.
 * Consequentially, warning messages may be printed to the console.
 * @param {XML} xml - the markup data that explains this graphml element
 * @param {Object} attributes - optional, existing data pertinent to this entity
 * @return {Object} attributes - the object that was passed or created to store the data
 */
GraphmlElement.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml)
		attributes.id = xml.getAttribute("id") || this.constructor.name;
	return attributes;
}

/**
 * Create an HTML component to represent this graphml element
 * @param {Object} attr - information pertinent to the creation of this representation
 * @returns {DIV} a DOMElement that represents the object and may contain other DOMElements that create a specific visualization of the object
 */
GraphmlElement.prototype.createElement = function(attr) {
	var rep = this.representation;
	
	var container = document.createElement("div");
	container.id = this.id;
	container.className = this.constructor.name.toLowerCase();
	if(rep && typeof(rep) == "object")
		container.appendChild( rep.createElement(attr) );
	else 
		console.log(this.constructor.name+" "+ this.id +" does not have a visual representation.");
	return container;
}

/**
 * Get a printable representation of this object.
 * @override
 * @returns {String} a string representation of this object
 */
GraphmlElement.prototype.toString = function() {
	var str = "["+this.constructor.name+":"+this.id;
	
	var rep = this.representation;
	if(rep) {
		str += " asa "
		if(typeof(rep) == "object")
			str += rep.toString();
		else
			str += this.getRepresentationName();
	}
	
	str += "]";
	return str;
}


/**
 * The base class that represents the pure graphml container of a graph element.
 * As an abstraction this class serves as the visual component for the element.
 * This class should not need to be extended or modified unless the graphml schema changes.
 * @property {String} id - a unique identifier for this element
 * @property {Object} data - information that helps construct the visual component of the Representation
 * @abstract
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function
 * @param {Object} attributes.xml - na
 */
function Representation(id, attributes) {
	attributes = attributes || {};
	this.id = id;
	this.data = null;
	
	if(attributes.xml)
		this.data = this.readXML(attributes.xml);
}

/**
 * Get the additional data that was included when the graphml element was created.
 * @returns {Object} the additional data
 */
Representation.prototype.getAttributes = function() {
	return this.data || {};
}

/**
 * Provide new additional data after the element exists.
 * @param {Object} attributes - the additional data
 * @returns {Boolean} always returns true
 */
Representation.prototype.setAttributes = function(attributes) {
	if(attributes && attributes.xml)
		this.data = this.readXML(attributes.xml);
	return true;
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @returns {Object} o - an object that contains the coordinates and span
 * @returns {Number} o.x - the x-coordinate of the element's top-left corner ("left" in HTML)
 * @returns {Number} o.y - the y-coordinate of the element's top-left corner ("top" in HTML)
 * @returns {Number} o.width - the span called width
 * @returns {Number} o.height - the span called height
 */
Representation.prototype.getBounds = function() {
	return { x:0, y:0, width:0, height:0 };
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @param {Object} bounds - an object that contains the coordinates and span
 * @param {Number} bounds.x - the x-coordinate of the element ("left" in HTML)
 * @param {Number} bounds.y - the y-coordinate of the element ("top" in HTML)
 * @param {Number} bounds.width - the span called width
 * @param {Number} bounds.height - the span called height
 * @param {Boolean} increment - rather than just setting the bounds, the new bounds is used as an offset
 */
Representation.prototype.setBounds = function(bounds, increment) {
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @param {XML} xml - the markup data that explains this graphml element
 */
Representation.prototype.readXML = function(xml) {
	var attributes = {};
	this.id = (attributes.id = xml.getAttribute("id") || this.id);
	this.xml = xml;
	return attributes;
}

/**
 * Create an HTML component to represent this graphml element
 * @param {Object} attr - information pertinent to the creation of this representation
 * @returns {DIV} a DOMElement that represents the object and may contain other DOMElements that create a specific visualization of the object
 */
Representation.prototype.createElement = function(attr) {
	var container = document.createElement("div");
	container.id = this.id+"-representation";
	return container;
}


/**
 * Get a printable representation of this object.
 * @override
 * @returns {String} a string representation of this object
 */
Representation.prototype.toString = function() {
	return "["+this.constructor.name+":"+this.id+"]";
}


/**
 * The basic container of a graphml graph element.
 * @property {Array[Node]} nodes - an Array of the Node ids that are contained by this graph
 * @property {Array[Edge]} edges - an Array of the Edge ids that are contained by this graph
 * @property {Array[Hyperedge]} hyperedges - an Array of the Hyperedge ids that are contained by this graph
 * @property {Object} subgraphs - a mapping of subgraphs contained by this graph
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Function} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Graph.prototype = new GraphmlElement();
Graph.prototype.constructor = Graph;
function Graph(id, shape, attributes) {
	GraphmlElement.call(this, id, shape, attributes);
	this.nodes = [];
	this.edges = [];
	this.hyperedges = [];
	this.subgraphs = {};
}

/**
 * Get all of the Node element ids contained by this Graph element.
 * @returns {Array[String]} a live mapping of all of the nodes
 */
Graph.prototype.getNodes = function() {
	return this.nodes;
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
 * @returns {Boolean} true, if the id is added; false, if it is already found in the Array and not added
 */
Graph.prototype.addNode = function(id) {
	var nodes = this.nodes;
	for(var i = 0, j = nodes.length; i < j; i++) {
		if(nodes[i].id == id)
			return false;
	}
	nodes.push(id);
	return true;
}

/**
 * Remove an existing Node element id from this Graph element
 * @param {String} id - a new Node element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeNode = function(id) {
	for(var i = 0, j = nodes.length; i < j; i++) {
		if(nodes[i].id == id) {
			nodes.splice(i,1);
			return false;
		}
	}
	return true;
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
 * Assign a new Edge element id to this Graph element
 * @param {String} id - a new Edge element id
 * @returns {Boolean} true, if the id is added; false, if it is already found in the Array and not added
 */
Graph.prototype.addEdge = function(id) {
	var edges = this.edges;
	for(var i = 0, j = edges.length; i < j; i++) {
		if(edges[i].id == id)
			return false;
	}
	edges.push(id);
	return true;
}

/**
 * Remove an existing Edge element id from this Graph element
 * @param {String} id - a new Edge element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeEdge = function(id) {
	for(var i = 0, edges = this.edges, j = edges.length; i < j; i++) {
		if(edges[i].id == id) {
			edges.splice(i,1);
			return false;
		}
	}
	return true;
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
 * Assign a new Hyperedge element id to this Graph element
 * @param {String} id - a new Hyperedge element id
 * @returns {Boolean} true, if the id is added; false, if it is already found in the Array and not added
 */
Graph.prototype.addHyperedge = function(id) {
	var hyperedges = this.edges;
	for(var i = 0, j = hyperedges.length; i < j; i++) {
		if(hyperedges[i].id == id)
			return false;
	}
	hyperedges.push(id);
	return true;
}

/**
 * Remove an existing Hyperedge element id from this Graph element
 * @param {String} id - a new Hyperedge element id
 * @returns {Boolean} true, if the id is removed; false, if it can not be removed
 */
Graph.prototype.removeHyperedge = function(id) {
	for(var i = 0, hyperedges = this.hyperedges, j = hyperedges.length; i < j; i++) {
		if(hyperedges[i].id == id) {
			hyperedges.splice(i,1);
			return false;
		}
	}
	return true;
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
 * @returns {Graph} the rpevious subgraph associated with this id
 */
Graph.prototype.setSubgraph = function(id, subgraph) {
	var subgraphs = this.subgraphs;
	var oldSubgraph = subgraphs[id];
	subgraphs[id] = subgraph;
	return oldSubgraph;
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


/**
 * The basic container of a graphml edge element.
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Edge.prototype = new GraphmlElement();
Edge.prototype.constructor = Edge;
function Edge(id, shape, attributes) {
	GraphmlElement.call(this, id, shape, attributes);
}

/**
 * Get basic valid attribute data from the edge entity
 * @override
 */
Edge.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		attributes.directed = xml.getAttribute("directed") == "true";
		var source = attributes.source = xml.getAttribute("source");
		var target = attributes.target = xml.getAttribute("target");
		if(!source || !target) {
			var err = [];
			if(!source)
				err.push("source");
			if(!target)
				err.push("target");
			console.log("The edge element '"+attributes.id+"' is missing one or more of its endpoints - "+err);
		}
	}
	return attributes;
}


/**
 * The basic container of a graphml hyperedge element.
 * Hyperedges are generalizations of edges in the sense that they do not only relate two endpoints to each other, but express a relation between an arbitrary number of enpoints.
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Hyperedge.prototype = new GraphmlElement();
Hyperedge.prototype.constructor = Hyperedge;
function Hyperedge(id, shape, attributes) {
	GraphmlElement.call(this, id, shape, attributes);
}

/**
 * Get basic valid attribute data from the hyperedge entity
 * @override
 */
Hyperedge.prototype.getGraphmlAttributes = function(xml, attributes) {
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		var endpoints = attributes.endpoints = [];
		var points = xml.getElementsByTagName("endpoint");
		var j = points.length;
		if(j) {
			for(var i = 0, j = points.length; i < j; i++) {
				var point = points[i];
				endpoints.push(point.getAttribute("node"));
			}
		}
		if(!endpoints.length)
			console.log("The hyperedge element '"+attributes.id+"' has no endpoints");
	}
	return attributes;
}