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
graphml_core.setup = function(canvas, graph, xml, attributes) {
	var gml = graphml_core.getHeader(xml);
	var header = graphml_core.getHeaderData(gml);
	if(graphml_core.validateGraphmlNamespace(header)) {
		console.log("Parsing graph data ...");
		graph.setHeader(header);
		graph.setGraphmlAttributes( graphml_core.getGraphmlAttributes(gml) );
		graphml_core.buildGraphTree(xml, graph);
	}
}

/**
 * Rule out everything else but the graph data, from the root of the graph (a <graphml> node).
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format
 * @returns {XML} markup data only specific to the first graphml structure provided in the xml data, or null if none can be found
 */
graphml_core.getHeader = function(xml) {
	var g = xml.getElementsByTagName("graphml");
	if(!g) {
		console.log("Error when parsing file data - there is no data");
		return null;
	}
	if(!g.length) {
		console.log("Error when parsing file data - there is no header");
		return null;
	}
	if(g.length > 1)
		console.log("Caution when parsing file data - multiple headers found, suggesting multiple graph roots, but only the first is going to be used");
	return g[0];
}

/**
 * Recover the paired prefix and namespace uri from the grapml content's header.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Object} namespaces - an object populated by the information on all supported namespaces in this file
 * @returns {String} id in namespaces - the prefix URI that references a namespace
 * @returns {Array[String]} namespaces[id] - an Array of namespace URI associated to namespaces
 */
graphml_core.getHeaderData = function(xml) {
	var attributes = xml.attributes;
	var header = {};
	header["xmlns"] = {}; // XML namespaces
	if(xml) {	
		header["xmlns"]["xmlns"] = ["http://graphml.graphdrawing.org/xmlns"]; // This default association will not be created normally
		for(var i = 0, j = attributes.length; i < j; i++) {
			var attr = attributes[i];
			var tagName = attr.name.split(":");
			var tagValue = attr.nodeValue.split(" ");
			
			if(tagName.length == 1) {
				if(tagName != "xmlns") // Already set up
					header[tagName] = tagValue;
			}
			else {
				var obj = header[tagName[0]];
				if(!obj)
					obj = (header[tagName[0]] = {});
				obj[tagName[1]] = tagValue;
			}
		}
	}
	return header;
}

/**
 * Confirm that the content we have been passed is acceptable graphml data by checking the header
 * @private
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Boolean} true, if the required graphml namespaces are properly set up; false, otherwise
 */
graphml_core.validateGraphmlNamespace = function(header) {
	console.log("Checking graphml specifications ...");
	
	var namespaces = header.xmlns;
	var xmlns = "http://graphml.graphdrawing.org/xmlns";
	if(!namespaces["xmlns"] || namespaces["xmlns"] != xmlns) {
		console.log("Error when parsing file data - graphml URI is missing or wrong");
		return false;
	}
	// Optional schema URI(s)
	var schema = namespaces["xsi"];
	if(schema) {
		if(schema.indexOf("http://www.w3.org/2001/XMLSchema-instance") == -1) {
			console.log("Error when parsing file data - URI is wrong for graphml data");
			return false;
		}
		schema = (header["xsi"] || {})["schemaLocation"]; // The optional location can contain many entries
		if(schema ? (schema.indexOf(xmlns) == -1 && schema.indexOf("http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd") == -1) : false) {
			console.log("Error when parsing file data - schema location is wrong");
			return false;
		}
	}
	return true; // Appropriate namespaces have been verified
}

/**
 * Process the initial few elements in the graphml structure that define the contents of the other major elements in the graph.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Object} obj - a collection of parsed <key> elements
 * @returns {Object} obj.id - data parsed from a specific <key> element (see below)
 * @returns {String} obj.id.id - the identifier associating this <key id=?> to <data key=?>
 * @returns {String} obj.id.for - the type connecting this <key> to a specific core graphml element
 * @returns {String} obj.id.'attr.name' - the label for primitive data in this field
 * @returns {String} obj.id.'attr.type' - the type of primitive data in this field
 * @returns {String} obj.id.'***' - complex data in this field (assumed to be handled by a namespace)
 * @returns {Object} obj.for - a non-standard collection of the same data above organized by it's 'for' attribute, followed by its 'id' attribute
 */
graphml_core.getGraphmlAttributes = function(xml) {
	/*
	EXAMPLE:
		<key id="d0" for="graph" attr.name="Description" attr.type="string"/>
		<key id="d1" for="port" yfiles.type="portgraphics"/>
	... where 'id' and 'for' are common, 'attr.name' and 'attr.type' clarifies primitive data, and anything else defines complex data
	*/
	var obj = {};
	var objFor = (obj.for = {});
	objFor["graphml"] = {};
	objFor["graph"] = {};
	objFor["node"] = {};
	objFor["edge"] = {};
	objFor["hyperedge"] = {};
	objFor["port"] = {};
	objFor["all"] = {};
	
	for(var i1 = 0, g = xml.getElementsByTagName("key"), j1 = g.length; i1 < j1; i1++) {
		var key = g[i1];
		var group = {};
		for(var i2 = 0, attributes = key.attributes, j2 = attributes.length; i2 < j2; i2++) {
			var attr = attributes[i2];
			// TODO: validate attributes 'for' and 'attr.type'?
			group[attr.name] = attr.value;
		}
		obj[group.id] = group;
		var forId = group.for;
		objFor[forId][group.id] = group;
		
	}
	
	// Shared fields, groups
	var fields = [objFor.edge, group = objFor.hyperedge, objFor.graph, group = objFor.graphml];
	for(var i = 0, j = fields.length; i < j; ) {
		var shared = fields[i++];
		var group = fields[i++];
		for(var id in shared) {
			if(id in group)
				continue;
			group[id] = shared[id];
		}
	}
	//Shared fields, all
	var shared = objFor.all;
	for(var id in shared) {
		for(var gid in objFor) {
			if(id == gid || id in objFor[gid])
				continue;
			objFor[gid][id] = shared[id];
		}
	}
	return obj;
}

/**
 * Apply graphml attribute definitions that belong to a specific graph XML element to an instance of that element.
 * @private
 * @static
 * @param {GraphmlElement} elem - a basic implementation of a core graphml element
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 * @param {XML} xml - the structured data in xml format, starting at a <data> element, that was isolated for this specific typer of graphml element
 * @param {String} asType - a suggestion regarding the interpretation of elem for checking against graphml attributes
 */
graphml_core.handleGraphmlAttributes = function(elem, graph, xml, asType) {
	var graphmlAttributes = graph.getGraphmlAttributes();
	var type = asType || elem.constructor.name.toLowerCase();
	var gdata = graphmlAttributes["for"][type];
	var children = xml.children;
	if(children.length && (!gdata || !Object.getOwnPropertyNames(gdata).length)) {
		console.log("GraphmlElement "+type+" "+elem.getId()+" has data but lacks clarification on how to use it");
		return;
	}
	
	var namespaces = graph.getHeader().xmlns;
	for(var i = 0, j = children.length; i < j; i++) {
		var data = children[i];
		var datatag = data.tagName;
		if(datatag != "data") // Not a <data> element; skip
			continue;
		
		var dataid = data.getAttribute("key");
		elem[dataid] = {};
		var gdataFormat = gdata[dataid];
		if(!gdataFormat) {
			console.log("GraphmlElement "+type+" "+elem.getId()+" has data but does not have a clarifying rule for it - "+dataid);
			continue;
		}
		
		var gdataFormatName = gdataFormat["attr.name"];
		if(gdataFormatName) { // Primitive data
			elem[dataid][gdataFormatName] = data.firstChild && data.firstChild.nodeValue;
		}
		else { // Complex data
			elem[dataid] = graphml_core.getNamespacedContent(data.firstElementChild, namespaces);
			var uri = elem[dataid].uri;
			var ns = GraphmlNamespace.get(uri);
			if(uri && ns)
				graph.setNamespace(uri, ns);
		}
	}
}

/**
 * Transform a complex (namespaced) graph XML element into a collection of information that would construct a valid container object.
 * @private
 * @static
 * @param {XML} data - the hierarchical contents of a <data> element that is not primitve in contents
 * @param {Object[GraphmlNamespace]} namespaces - paired namespace prefixes and URIs that were defined in the header of this graph
 * @returns {Object} o - the paired namespace and cited object type from that schema that will be used to depict the node's data
 * @returns {String} o.uri - the namespace URI
 * @returns {String} o.className - the data managing class type to be found in that namespace
 * @returns {XML} o.xml - the same as the parameter 'data', for future parsing purposes
 */
graphml_core.getNamespacedContent = function(data, namespaces) {
	if(data && namespaces) {
		var tagName = data.tagName; // The namespaced tag will be of the format "PREFIX:OBJECT_TYPE," split into "PREFIX" and "OBJECT_TYPE"
		var promotedTagName = tagName.charAt(0).toUpperCase() + tagName.slice(1, tagName.length);
		if(!this.getSpecificClass(promotedTagName)) { // If we encounter core graphml, skip over it
			var tags = tagName.split(":");
			if(tags[0] in namespaces) {
				var prefix = namespaces[tags[0]]; // The PREFIX will point to a namespace defined in this graph
				return {uri:prefix[0], className:tags[1].slice(0), xml:data};
			}
			else
				console.log("GraphmlCanvas: could not match <data> contents to a defined namespace "+tags[0]);
		}
		else
			console.log("GraphmlCanvas: core graphml element found as the unexpected child of a <data> element");
	}
	return {uri:null, className:null, xml:null};
}

/**
 * The base function that prepares the container GraphPaper for the root Graph Graphml element.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the significant element
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
graphml_core.buildGraphTree = function(xml, graph) {
	var rootElem = xml.getElementsByTagName("graph")[0];
	var rootGraph = graphml_core.parseGraphElement(rootElem, graph);
	graphml_core.handleGraphmlAttributes(graph, graph, xml.getElementsByTagName("graphml")[0], "graphml");
	graph.setRootGraph(rootGraph);
}

/**
 * Assemble a Graph Graphml element.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the significant element
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
graphml_core.parseGraphElement = function(xml, graph) {
	var graphClass = this.getSpecificClass("Graph");
	var graphObject = new graphClass("", {xml:xml});
	graphml_core.handleGraphmlAttributes(graphObject, graph, xml);
	
	for(var i = 0, children = xml.children, j = children.length; i < j; i++) {
		var childElem = children[i];
		var childObject = null;
		switch(childElem.tagName) {
			case "node":
				childObject = graphml_core.parseNodeElement(childElem, graph);
				graphObject.addNode(childObject.getId(), childObject);
				break;
			case "edge":
				childObject = graphml_core.parseElement(childElem, graph);
				graphObject.addEdge(childObject.getId(), childObject);
				break;
			case "hyperedge":
				childObject = graphml_core.parseElement(childElem, graph);
				graphObject.addHyperedge(childObject.getId(), childObject);
				break;
			case "data":
				break; // We would have already confirmed if this <data> were invalid
			default:
				console.log("Unexpected element "+childElem.tagName+" encountered in graph hierarchy");
		}
	}
	return graphObject;
}

/**
 * Assemble a Node Graphml element.
 * Nodes are the parents of potential subgraphed Graph Graphml elements.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the significant element
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
graphml_core.parseNodeElement = function(xml, graph) {
	var nodeObject = graphml_core.parseElement(xml, graph);
	var graphElem = xml.getElementsByTagName("graph")[0];
	if(graphElem) {
		var graphObject = graphml_core.parseGraphElement(graphElem, graph);
		nodeObject.setSubgraph(graphObject);
	}
	return nodeObject;
}

/**
 * Assemble a known but inspecific Graphml element.
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the significant element
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
graphml_core.parseElement = function(xml, graph) {
	var elemName = xml.tagName[0].toUpperCase() + xml.tagName.slice(1);
	var elemClass = this.getSpecificClass(elemName);
	var elemObject = new elemClass("", {xml:xml});
	graphml_core.handleGraphmlAttributes(elemObject, graph, xml);
	return elemObject;
}