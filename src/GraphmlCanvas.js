/**
 * A handle on the canvas object and the routines that will draw the UML onto the canvas
 * @property {DOMElement} canvas - a page element used for drawing/containing graph content
 * @property {GraphPaper} graph - the currently loaded graph
 * @property {GraphPaper} defaultGraph - the graph that loads when no other graph is loaded
 * @property {Object} graphData - information pertinent to the display of the current graph
 * @property {Integer} graphData.zoom - the current zoom factor on the current graph
 * @constructor
 * @param {Object} attributes - information pertinent to the creation of this object
 */
function GraphmlCanvas(attributes) {
	this.canvas = null;
	this.graph = null;
	this.defaultGraph = null;
	this.graphData = {
		x:0,
		y:0,
		dx:0,
		dy:0,
		zoom:1,
		pad:50,
		scrollState:false,
		scrollLock:false
	};
	
	if(attributes) {
		var canvas = this.findCanvas(attributes);
		if(canvas)
			this.setCanvas(canvas);
		if(attributes.defaultGraph)
			this.setDefaultGraph(attributes.defaultGraph);
	}
}

/**
 * Selecting from a series of sources, find something that we consider a valid canvas element for the graph
 * @param {Object} attributes - information pertinent to the method
 * @param {DOMElement} attributes.canvas - a DOMElement to be the canvas
 * @param {String} attributes.canvasId - an id for the proposed DOMElement to be the canvas
 * @param {String} attributes.canvasClass - a CSS class for the proposed DOMElement to be the canvas
 * @throws {Error} if the scope of the method call was not part of a valid HTML page (fundamental error)
 * @returns {DOMElement} a discovered valid canvas object
 */
GraphmlCanvas.prototype.findCanvas = function(attributes) {
	var cattributes = attributes || {};
	if(!document)
		throw new Error("No document for the canvas (object not constructed on an HTML page?)");
	var canvas = cattributes.canvas;
	var canvasId = cattributes.canvasId;
	var canvasClass = cattributes.canvasClass;
	
	// If we are given the element to be the canvas ...
	if(canvas) {
		// TODO: test that canvas is a valid DOMElement
		var tCanvasClass = canvasClass || "GraphmlCanvas";
		if(canvas.className.search(tCanvasClass) == -1) {
			console.log("Canvas provided is missing CSS class - "+ tCanvasClass +" (appending)");
			canvas.className += tCanvasClass; // If given a bad custom class, probably user error at this point
		}
	}
	// If we are not given the element to be the canvas ...
	else {
		if(canvasId) { // With the id, try to grab a valid DOMElement
			canvas = document.getElementById(canvasId);
			if(!canvas)
				console.log("Canvas id does not match element in document hierarchy - "+ canvasId); // Just log problem.  More below.
			else
				return this.findCanvas({canvas:canvas, canvasClass:canvasClass});
		}
		if(canvasClass) {
			var divs = document.getElementsByClassName(canvasClass);
			for(var i = 0, j = divs.length; i < j; i++) {
				canvas = divs[i];
				break;
			}
			if(!canvas)
				console.log("CSS class provided does not match a DOMElement in document hierarchy - "+ canvasClass); // Just log problem.  More below.
		}
		if(canvasClass != "GraphmlCanvas") {
			var divs = document.getElementsByClassName("GraphmlCanvas");
			for(var i = 0, j = divs.length; i < j; i++) {
				canvas = divs[i];
				break;
			}
		}
		if(!canvas) {
			console.log("Nothing could be identified as a valid canvas element"); // There is nothing more we can do
			return;
		}
	}
	console.log("Valid canvas object found.");
	return canvas;
}

/**
 * na
 */
GraphmlCanvas.prototype.setScroll = function(scrollState) {
	var graphData = this.graphData;
	var oldState = graphData.scrollState;
	graphData.scrollState = scrollState;
	var canvas = this.canvas;
	if(scrollState != oldState) {
		if(scrollState) {
			if(canvas) {
				canvas.addEventListener("mousedown", GraphmlCanvas.prototype.scrollmdown.bind(this));
				canvas.addEventListener("mousemove", GraphmlCanvas.prototype.scrollmmove.bind(this));
				canvas.addEventListener("mouseup", GraphmlCanvas.prototype.scrollmout.bind(this));
			}
		}
		else {
			if(canvas) {
				canvas.removeEventListener("mousedown", GraphmlCanvas.prototype.scrollmdown.bind(this));
				canvas.removeEventListener("mousemove", GraphmlCanvas.prototype.scrollmmove.bind(this));
				canvas.removeEventListener("mouseup", GraphmlCanvas.prototype.scrollmout.bind(this));
			}
			graphData.scrollLock = false;
		}
	}
}

/**
 * na
 * @returns {Boolean} na
 */
GraphmlCanvas.prototype.getScroll = function(scrollState) {
	return this.graphData.scrollState;
}

/**
 * na
 * @private
 */
GraphmlCanvas.prototype.scrollmdown = function(evt) {
	if(this.getScroll()) {
		var data = this.graphData;
		var content = this.getContentLayer();
		var contentLeft = content.style.left;
		var contentTop = content.style.top;
		
		contentLeft = contentLeft.slice(0, contentLeft.length-2);
		contentTop = contentTop.slice(0, contentTop.length-2);
		data.x = contentLeft;
		data.y = contentTop;
		data.dx = evt.clientX - contentLeft;
		data.dy = evt.clientY - contentTop;
		data.scrollLock = true;
	}
}

/**
 * na
 * @private
 */
GraphmlCanvas.prototype.scrollmout = function(evt) {
	this.graphData.scrollLock = false;
}

/**
 * na
 * @private
 */
GraphmlCanvas.prototype.scrollmmove = function(evt) {
	var data = this.graphData;
	if(data.scrollLock) {
		var content = this.getContentLayer();
		data.x = (evt.clientX - data.dx);
		data.y = (evt.clientY - data.dy);
		content.style.left = data.x+"px";
		content.style.top = data.y+"px";
		// Redraw background layer
		canvas.clearBackgroundLayer();
		canvas.getGraph().drawBackground(this);
		// Stop event bubbling
		evt.preventDefault();
		evt.cancelBubble = true;
	}
}

/**
 * Return the active canvas
 * @returns {DOMElement} The drawing surface
 */
GraphmlCanvas.prototype.getCanvas = function getCanvas() {
	return this.canvas;
}

/**
 * Set a canvas element as the active canvas, or display a message about why it can't be the active canvas
 * @param {DOMElement} canvas - the element to be used as the drawing surface
 */
GraphmlCanvas.prototype.setCanvas = function setCanvas(canvas) {
	this.canvas = canvas;
}

/**
 * Get the graph currently being depicted by this canvas element.
 * @returns {GraphmlPaper} the graph
 */
GraphmlCanvas.prototype.getGraph = function() {
	return this.graph;
}

/**
 * Set the graph currently being depicted by this canvas element.
 * @param {GraphmlPaper} newGraph - the graph
 * @returns {Boolean} always returns true
 */
GraphmlCanvas.prototype.setGraph = function(newGraph) {
	var prevGraph = this.graph;
	this.graph = newGraph;
	
	if(prevGraph) { // Remove the previous graph
		this.clearContentLayer();
		this.clearBackgroundLayer();
		this.setScroll(false);
		this.graphData.x = 0;
		this.graphData.y = 0;
		//this.zoom(1); // Restore the default zoom
	}
	
	if(newGraph) { // Draw the new graph
		console.log("Loading "+ newGraph.id +" graph ...");
		newGraph.draw(this);
	}
	else { // Draw the default graph
		this.loadDefaultGraph();
	}
	return true;
}

/**
 * Determine whether the scroll bars are visible.
 * @param {Boolean} true, if the scrollbar can be seen and manipulated; false, otherwise
 */
GraphmlCanvas.prototype.areScrollBarsVisible = function() {
	var canvas = this.getCanvas();
	if(!canvas)
		return {horizontal:false, vertical:false};
	
	var overflow = window.getComputedStyle(canvas).overflow;
	if(overflow == "visible" || overflow == "hidden") {
		return { horizontal:false, vertical:false };
	}
	else {
		return {
			horizontal:canvas.scrollWidth > canvas.clientWidth,
			vertical:canvas.scrollHeight > canvas.clientHeight
		};
	}
}

/**
 * Get the width of the canvas, excluding the scrollbar.
 * @returns {Integer} The width of the DOMElement associated as the canvas; 0, if nothing is associated
 */
GraphmlCanvas.prototype.getWidth = function() {
	var canvas = this.canvas;
	return canvas ? canvas.clientWidth : 0;
}

/**
 * Get the width of the canvas, including the scrollbar.
 * @returns {Integer} The width of the DOMElement associated as the canvas; 0, if nothing is associated
 */
GraphmlCanvas.prototype.getHorizontalCanvasSpace = function() {
	var canvas = this.canvas;
	return canvas ? this.getWidth() - (this.areScrollBarsVisible().horizontal ? 17 : 0) : 0;
}

/**
 * Get the height of the canvas, excluding the scrollbar.
 * @returns {Integer} The height of the DOMElement associated as the canvas; 0, if nothing is associated
 */
GraphmlCanvas.prototype.getHeight = function() {
	var canvas = this.canvas;
	return canvas ? canvas.clientHeight : 0;
}

/**
 * Get the width of the canvas, including the scrollbar.
 * @returns {Integer} The width of the DOMElement associated as the canvas; 0, if nothing is associated
 */
GraphmlCanvas.prototype.getVerticalCanvasSpace = function() {
	var canvas = this.canvas;
	return canvas ? this.getHeight() - (this.areScrollBarsVisible().horizontal ? 20 : 0) : 0;
}

/**
 * Center the graph on the canvas.
 */
GraphmlCanvas.prototype.center = function() {
	var canvas = this.canvas;
	if(!canvas)
		return;
	
	var graph = this.graph;
	var data = this.graphData;
	var content = this.getContentLayer().style;
	if(!graph) {
		data.x = this.getHorizontalCanvasSpace()/2;
		data.y = this.getVerticalCanvasSpace()/2;
	}
	else {
		data.x = this.getHorizontalCanvasSpace()/2 - graph.getWidth()/2;
		data.y = this.getVerticalCanvasSpace()/2 - graph.getHeight()/2;
		this.clearBackgroundLayer();
		graph.drawBackground(this); // Redraw the background
	}
	content.left = data.x + "px";
	content.top = data.y + "px";
}

/**
 * Get the coordinates of the point on the graph in the middle of the canvas
 * @param {Boolean} frontOfScrollbar - if the size of the graph is greater than a single page in any dimension, subtract half of the scrollbar length
 * @returns {Object} o - an object that contains the coordinates of the center of the current graph
 * @returns {Number} o.x - the x-coordinate of the center
 * @returns {Number} o.y - the y-coordinate of the center
 */
GraphmlCanvas.prototype.getGraphCenterCoordinates = function(frontOfScrollbar) {
	var canvas = this.canvas;
	if(!canvas)
		throw new Error("Can not calculate the center of a graph on a canvas element when not assigned a canvas element.");
	
	var canvasData = this.graphData;
	var graphData = this.graph ? this.graph.getGraphData() : { x:0, y:0 };
	
	var originX = canvasData.x + graphData.x;
	var originY = canvasData.y + graphData.y;
	var canvasCenterX = this.getHorizontalCanvasSpace()/2;
	var canvasCenterY = this.getVerticalCanvasSpace()/2;
	
	return {
		x:canvasCenterX - originX,
		y:originY - canvasCenterY // graph is positive-up, negative-down; HTML is negative-up, positive-down
	};
}

/**
 * Get the default graph.
 * This graph is displayed when no other graph is displayed.
 * @returns {GraphmlPaper} the default graph
 */
GraphmlCanvas.prototype.getDefaultGraph = function() {
	return this.defaultGraph;
}

/**
 * Set the default graph.
 * This graph is displayed when no other graph is displayed.
 * @param {GraphmlPaper} defGraph - the default graph
 * @param {Booloean} defGraph - if 'true', then a default graph is created automatically
 * @returns {Boolean} always returns true
 */
GraphmlCanvas.prototype.setDefaultGraph = function(defGraph) {
	if(!defGraph && !this.defaultGraph)
		return;
	
	var prevDefaultGraph = this.defaultGraph;
	if(defGraph === true)
		defGraph = new GraphmlPaper("default");
	this.defaultGraph = defGraph;
	
	this.loadDefaultGraph();
	return true;
}

/**
 * Load the default graph into the canvas if there is none set.
 * @returns {Boolean} true, if a default graph is loaded
 */
GraphmlCanvas.prototype.loadDefaultGraph = function() {
	var defaultGraph = this.getDefaultGraph();
	var currentGraph = this.getGraph();
	
	if(defaultGraph) {
		if(currentGraph !== defaultGraph) // Default graph is not currently loaded
			this.setGraph(defaultGraph);
		return true;
	}
	return false;
}

/**
 * Get the background layer container element on this canvas element.
 * @returns {DOMElement} the first <div> with the id "background" that is a child of this canvas element
 */
GraphmlCanvas.prototype.getBackgroundLayer = function() {
	if(this.canvas) {
		var children = this.canvas.children;
		for(var i = 0, j = children.length; i < j; i++) {
			if(children[i].id == "background")
				return children[i];
		}
	}
	return null;
}

/**
 * Take the content of the provided DOMElement and replace the background layer with it.
 * @param {DOMElement} elem - the element new content is drawn from
 */
GraphmlCanvas.prototype.setBackgroundLayer = function(elem) {
	var bg = this.getBackgroundLayer();
	if(bg && elem) {
		bg.innerHTML = elem.innerHTML;
	}
}

/**
 * Take the provided DOMElement and add it to the background layer as a child.
 * @param {DOMElement} elem - the element new content is drawn from
 */
GraphmlCanvas.prototype.setToBackgroundLayer = function(elem) {
	var bg = this.getBackgroundLayer();
	if(bg && elem) {
		bg.appendChild(elem);
	}
}

/**
 * Clear the background layer of all child elements.
 */
GraphmlCanvas.prototype.clearBackgroundLayer = function() {
	var bg = this.getBackgroundLayer();
	if(bg)
		this.clearLayer(bg);
}

/**
 * Get the background layer container element on this canvas element.
 * @returns {DOMElement} the first <div> with the id "content" that is a child of this canvas element
 */
GraphmlCanvas.prototype.getContentLayer = function() {
	if(this.canvas) {
		var children = this.canvas.children;
		for(var i = 0, j = children.length; i < j; i++) {
			if(children[i].id == "content")
				return children[i];
		}
	}
	return null;
}

/**
 * Take the content of the provided DOMElement and replace the content layer with it.
 * @param {DOMElement} elem - the element new content is drawn from
 */
GraphmlCanvas.prototype.setContentLayer = function(elem) {
	var content = this.getContentLayer();
	if(content && elem) {
		content.innerHTML = elem.innerHTML;
	}
}

/**
 * Take the provided DOMElement and add it to the content layer as a child.
 * @param {DOMElement} elem - the new content
 * @param {DOMElement} subElem - a nested DOMElement in the content layer into which the elem is appended
 */
GraphmlCanvas.prototype.setToContentLayer = function(elem, subElem) {
	if(elem) {
		var content = this.getContentLayer();
		var subContent = document.getElementById(subElem);
		if(subContent)
			// TODO: test that subContent exists within content; if not, do not append elem into it
			subContent.appendChild(elem);
		else if(content)
			content.appendChild(elem);
		else
			console.log("Could not add "+elem.id+" anywhere.");
	}
}

/**
 * Clear the content layer of all child elements.
 */
GraphmlCanvas.prototype.clearContentLayer = function() {
	var content = this.getContentLayer();
	if(content)
		this.clearLayer(content);
}

/**
 * Clear the layer of all child elements.
 * @param {DOMElement} div - the layer to be cleared
 */
GraphmlCanvas.prototype.clearLayer = function(div) {
	while(div.firstChild)
		div.removeChild(div.firstChild);
	div.innerHTML = "";
}

/**
 * Get the data that asists formatting the current graph.
 * @returns {Object} canvas-graph exclusive information
 */
GraphmlCanvas.prototype.getGraphData = function() {
	return this.graphData;
}

/**
 * Set the data that asists formatting the current graph.
 * @param {Object} newData - canvas-graph exclusive information, contents optional but filtered on being set individually
 */
GraphmlCanvas.prototype.setGraphData = function(newData) {
	newData = newData || {};
	var data = this.graphData;
	if("zoom" in newData)
		data.zoom = newData.zoom;
	if("pad" in newData)
		data.pad = newData.pad;
}

/**
 * Process data trasnfer from a location (a network url or file location) where markup language can be found for display on this canvas.
 * @param {String} url - the location of the data to be transferred and processed
 */
GraphmlCanvas.prototype.load = function(url) {
	if(this.getCanvas()) {
		var xhr = new XMLHttpRequest();
		xhr.addEventListener("progress", this.updateProgress.bind(this)); // Context of this graph object, not the request object
		xhr.addEventListener("load", this.transferComplete.bind(this));
		xhr.addEventListener("error", this.transferFailed.bind(this));
		xhr.addEventListener("abort", this.transferCanceled.bind(this));
		xhr.open("get", url, true);
		//xhr.setRequestHeader('Content-Type', 'text/xml');
		//xhr.overrideMimeType('text/xml');
		xhr.responseType = "text/xml";
		xhr.send();
	}
	else
		console.log("No canvas on which to draw.")
}

/**
 * Display a console message regarding the status of the requested data.
 * @param {?} evt - the current event
 * @param {Boolean} evt.lengthComputable - whether fine information about the amount of data that has been loaded can be reported upon
 * @param {Number} evt.loaded - the currently-loaded portion of the data
 * @param {Number} evt.total - the total size of the data to be loaded
 */
GraphmlCanvas.prototype.updateProgress = function(evt) {
	if(evt.lengthComputable) {
		var percentComplete = (evt.loaded / evt.total) * 100;
		if(percentComplete < 100)
			console.log("The transfer is "+ percentComplete +"% complete.");
	}
	else {
		// Unable to compute progress information since the total size is unknown
	}
}

/**
 * Display a console message regarding the failure of the data transfer.
 * @param {?} evt - the current event
 */
GraphmlCanvas.prototype.transferFailed = function(evt) {
	console.log("An error occurred while transferring the file.");
}

/**
 * Display a console message regarding the termination of the data transfer.
 * @param {?} evt - the current event
 */
GraphmlCanvas.prototype.transferCanceled = function(evt) {
	console.log("The transfer has been canceled by the user.");
}

/**
 * Display a console message regarding the completion of the data transfer.
 * When the data is completely loaded, get the XML and begin parsing it.
 * @param {?} evt - the current event
 * @param {?} evt.originalTarget - the original request object
 */
GraphmlCanvas.prototype.transferComplete = function(evt) {
	var xhr = evt.currentTarget || evt.originalTarget || evt.srcElement;
	var xml = xhr.responseXML;
	if(!xml && xhr.responseText)
		xml = new DOMParser().parseFromString(xhr.responseText, 'text/xml');
	if(xml) {
		console.log("The transfer is complete.");
		this.readXML(xml);
	}
	else
		this.transferFailed(evt);
}

/**
 * The workflow when provided with new XML data to be interpretted.
 * @private
 * @param {XML} xml - na
 */
GraphmlCanvas.prototype.readXML = function(xml) {
	var gml = GraphmlCanvas.getHeader(xml);
	if(this.validateRequiredNamespaces(gml)) {
		console.log("Parsing graph data ...");
		var namespaces = this.extractHeaderNamespaces(gml);
		var attributes = GraphmlCanvas.getAttributes(gml);
		var structures = this.readStructures(gml, namespaces);
		structures.graphmlAttributes = attributes;
		var name = xml.URL.slice(xml.URL.lastIndexOf("/")+1);
		
		var graph = new GraphmlPaper(name, {graphmlAttributes:attributes});
		this.prepareElements(graph, structures, gml);
		this.setGraph(graph);
	}
}

/**
 * Rule out everything else but the graph data, from the root of the graph (a <graphml> node).
 * @private
 * @static
 * @param {XML} xml - na
 * @returns {XML} markup data only specific to the first graphml structure provided in the xml data, or null if none can be found
 */
GraphmlCanvas.getHeader = function(xml) {
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
		console.log("Caution when parsing file data - multiple headers found, suggesting multiple graph roots");
	return g[0];
}

/**
 * Confirm that the content we have been passed is acceptable graphml data by checking the header
 * @private
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Boolean} true, if the required graphml namespaces are properly set up; false, otherwise
 */
GraphmlCanvas.prototype.validateRequiredNamespaces = function(xml) {
	console.log("Checking graphml specifications ...");
	
	var xmlns = "http://graphml.graphdrawing.org/xmlns";
	var g = xml;
	var uri = g.getAttribute("xmlns");
	if(!uri || uri != xmlns) {
		console.log("Error when parsing file data - namespace URI is wrong for graphml data");
		return false;
	}
	// Optional namespace schema URI(s)
	uri = g.getAttribute("xmlns:xsi");
	if(uri) {
		if(uri.indexOf("http://www.w3.org/2001/XMLSchema-instance") == -1) {
			console.log("Error when parsing file data - URI is wrong for graphml data");
			return false;
		}
		uri = g.getAttribute("xsi:schemaLocation"); // The optional location can contain many entries; for the moment, one of these two will be accepted
		if(uri ? (uri.indexOf(xmlns) == -1 && uri.indexOf("http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd") == -1) : false) {
			console.log("Error when parsing file data - URI is wrong for graphml data");
			return false;
		}
	}
	return true;
}

/**
 * Recover the paired prefix and namespaces from the grapml content's header
 * @private
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Object} namespaces - an object populated by the information on all supported namespaces in this file
 * @returns {String} id in namespaces - the prefix URI that references a namespace
 * @returns {Array[String]} namespaces[id] - an Array of namespace URI associated to namespaces
 */
GraphmlCanvas.prototype.extractHeaderNamespaces = function(xml) {
	var g = xml;
	var namespaces = {}, attributes = g.attributes; // Allocate the namespaces in the header
	
	namespaces["graphml"] = ["http://graphml.graphdrawing.org/xmlns"]; // This default association will not be allocated normally
	for(var i = 0, j = attributes.length; i < j; i++) {
		var attr = attributes[i];
		var tag = attr.name.split(":");
		if(tag.length == 2)
			namespaces[tag[1]] = attr.nodeValue.split(" ");
	}
	return namespaces;
}

/**
 * na
 * @private
 * @static
 * @param {XML} xml - the structured data in xml format, starting at the header
 * @returns {Object} obj - na
 * @returns {Object} obj.id - na
 * @returns {Object} obj.id.id - na
 * @returns {String} obj.id.'attr.name' - na
 * @returns {String} obj.id.'attr.type' - na
 * @returns {String} obj.id.for - na
 */
GraphmlCanvas.getAttributes = function(xml) {
	/*
	EXAMPLE
	<key id="d0"  for="graph" attr.name="Description" attr.type="string"/>
	<key id="d1"  for="port" yfiles.type="portgraphics"/>
	<key id="d2"  for="port" yfiles.type="portgeometry"/>
	<key id="d3"  for="port" yfiles.type="portuserdata"/>
	<key id="d4"  for="node" attr.name="url" attr.type="string"/>
	<key id="d5"  for="node" attr.name="description" attr.type="string"/>
	<key id="d6"  for="node" yfiles.type="nodegraphics"/>
	<key id="d7"  for="graphml" yfiles.type="resources"/>
	<key id="d8"  for="edge" attr.name="url" attr.type="string"/>
	<key id="d9"  for="edge" attr.name="description" attr.type="string"/>
	<key id="d10" for="edge" yfiles.type="edgegraphics"/>
	*/
	var obj = {};
	
	for(var i1 = 0, g = xml.getElementsByTagName("key"), j1 = g.length; i1 < j1; i1++) {
		var key = g[i1];
		var group = {};
		for(var i2 = 0, attributes = key.attributes, j2 = attributes.length; i2 < j2; i2++) {
			var attr = attributes[i2];
			// TODO: validate attributes 'for' and 'attr.type'?
			group[attr.name] = attr.value;
		}
		obj[group.id] = group;
	}
	return obj;
}

/**
 * Parse the standard graphml node data that can be found in a valid graphml file.
 * @private
 * @param {XML} xml - the structured data in graphml format
 * @param {Object} namespaces - the namespaces that were defined in the header of the file for this structured data
 * @returns {Object} o - an object populated by the information in the file
 * @returns {Array[ParsedGraphmlNode]} o.graphs - an Array of found subgraphs
 * @returns {Array[ParsedGraphmlNode]} o.nodes - an Array of found nodes
 * @returns {Array[ParsedGraphmlNode]} o.edges - an Array of found edges
 * @returns {Array[ParsedGraphmlNode]} o.hyperedges - an Array of found hyperedges
 */
GraphmlCanvas.prototype.readStructures = function(xml, namespaces) {
	var structures = {};
	structures.graphs = [];
	structures.nodes = [];
	structures.edges = [];
	structures.hyperedges = [];
	
	var list = null;
	this.nodeListToArray(xml.getElementsByTagName("graph"), namespaces, structures.graphs);
	this.nodeListToArray(xml.getElementsByTagName("node"), namespaces, structures.nodes);
	this.nodeListToArray(xml.getElementsByTagName("edge"), namespaces, structures.edges);
	this.nodeListToArray(xml.getElementsByTagName("hyperedge"), namespaces, structures.hyperedges);
	
	return structures;
}

/**
 * Perform early dissection of the node data to determine what to do with it
 * @private
 * @param {NodeList} nodeList - a not-Array data structuce of specific types of nodes
 * @param {Object} namespaces - the namespaces that were defined in the header of the file for this structured data
 * @param {Array[?]} arrayList - an optional existing array onto which the dissected node data will be pushed
 * @returns {Array[ParsedGraphmlNode]} an array of the encapsulated node data in the form of an intermediary structure
 */

GraphmlCanvas.prototype.nodeListToArray = function(nodeList, namespaces, arrayList) {
	/*
	This function extracts the id and separates the namespace and object type, if possible.
	Doing so this early may be exceptional; but, it makes separation between "reading of node data" and "visualizing node data" better defined.
	*/
	var ary = arrayList || [];
	for(var i = 0, j = nodeList.length; i < j; i++) {
		var node = nodeList[i];
		var id = node.getAttribute("id");
		var dtrct = this.pairNamespaceFromHeader(node, namespaces);
		var container = new GraphmlCanvas.ParsedGraphmlNode(id, dtrct.namespace, dtrct.representation, node);
		ary.push(container);
	}
	return ary;
}

/**
 * Find a valid namespaced class object that will be created for this element from the header definition of the prefix.
 * @private
 * @param {XML} elem - an isolated graphml node
 * @param {Object} namespaces - the namespaces that were defined in the header of the file for this structured data
 * @returns {Object} o - the paired namespace and cited object type from that schema that will be used to depict the node's data
 * @returns {String} o.namespace - the namespace prefix
 * @returns {String} o.representation - the object type to be found in that namespace
 */
GraphmlCanvas.prototype.pairNamespaceFromHeader = function(elem, namespaces) {
	if(!namespaces)
		return null;
	var children = elem.children;
	for(var i = 0, j = children.length; i < j; i++) {
		var tagName = children[i].tagName; // The namespaced tag will be of the format "PREFIX:OBJECT_TYPE," split into "PREFIX" and "OBJECT_TYPE"
		 var promotedTagName = tagName.charAt(0).toUpperCase() + tagName.slice(1, tagName.length);
		if(GraphmlNamespace.get("http://graphml.graphdrawing.org/xmlns").getSpecificClass(promotedTagName)) // If we encounter a core graphml node, skip over it
			continue;
		
		var tags = tagName.split(":");
		if(tags[0] in namespaces) {
			var prefix = namespaces[tags[0]]; // The PREFIX will point to a namespace defined in this graph
			return {namespace:prefix[0], representation:tags[1].slice(0)};
		}
		
		if(children[i].children.length) { // Exhaustive :/
			var result = this.pairNamespaceFromHeader(children[i], namespaces);
			if(result)
				return result;
		}
	}
	return {namespace:null, representation:null};
}

/**
 * Take the extracted graphml data stored as lists and construct objects with appropriate visual Representions.
 * Also, call setup on all of the include namespaces.
 * @private
 * @param {GraphPaper} graph - na
 * @param {Object} structures - an object populated by the information in the file
 * @param {Array[ParsedGraphmlNode]} structures.graphs - an Array of subgraphs
 * @param {Array[ParsedGraphmlNode]} structures.nodes - an Array of nodes
 * @param {Array[ParsedGraphmlNode]} structures.edges - an Array of edges
 * @param {Array[ParsedGraphmlNode]} structures.hyperedges - an Array of hyperedges
 * @param {XML} xml - the structured data in graphml format
 */
GraphmlCanvas.prototype.prepareElements = function(graph, structures, xml) {
	var xmlns = GraphmlNamespace.get("http://graphml.graphdrawing.org/xmlns");
	
	var usedNamespaces = [];
	var structuresGroups = ["graphs", "nodes", "edges", "hyperedges"];
	for(var i1 = 0, j1 = structuresGroups.length; i1 < j1; i1++) {
		var tag = structuresGroups[i1];
		var promotedTag = tag.charAt(0).toUpperCase() + tag.slice(1, tag.length-1); // e.g., nodes --> Node and edges --> Edge
		var list = structures[tag];
		var mainClass = xmlns.getSpecificClass(promotedTag); // This is the general graphml representation of the data
		var setFunc = GraphmlPaper.prototype["set"+promotedTag];
		for(var i2 = 0, j2 = list.length; i2 < j2; i2++) {
			var entry = list[i2];
			var entryNamespace = "";
			var entryRepresentation = null;
			
			var entryPrefix = entry.namespace;
			entryNamespace = GraphmlNamespace.get(entryPrefix);
			if(entryNamespace) {
				entryRepresentation = entryNamespace.getSpecificClass(entry.representation); // This is the specific namespace representation of the data
				if(!graph.getNamespace(entryPrefix)) { // We don't want to allocate a used namespace more than once
					graph.setNamespace(entryPrefix, entryNamespace)
					usedNamespaces.push(entryNamespace);
				}
			}
			
			var node = new mainClass(entry.id, entryRepresentation, {xml:entry.data});
			setFunc.call(graph, entry.id, node); // Function for adding the object to graph
		}
	}
	
	console.log("Performing supplementary namespace setup(s) ...");
	for(var i4 = 0, j4 = usedNamespaces.length; i4 < j4; i4++) { // Run setup for all of the namespaces that have been used on this graph
		(usedNamespaces[i4]).setup(this, graph, xml);
	}
}

GraphmlCanvas.prototype.zoom = function(factor) {
	console.log("Can not zoom by default.  Setup zooming based through(for) a namespace.");
}

/**
 * Apply a css transformation to a specific style in all applicable style attributes for cross-browser compatibility.
 * @static
 * @private
 * @param {String} transform - the css transform to be applied
 * @param {DOMElement} style - the element's style to which the transform will be applied
 */
GraphmlCanvas.setTransform = function(transform, style) {
	style["-ms-transform"] =
	style["-webkit-transform"] =
	style["transform"] = transform;
}


/**
 * An intermediary storage structure for data extracted from graphml nodes during the preliminary parsing phase
 * @private
 * @property {String} id - the id associated with this graphml data
 * @property {String} namespace - the namespace that governs the specifics of the graphml data
 * @property {String} representation - the specific visualization of this graphml data
 * @property {XML} data - the root of the original graphml data
 */
GraphmlCanvas.ParsedGraphmlNode = function(id, namespace, representation, data) {
	this.id = id || "";
	this.namespace = namespace || null;
	this.representation = representation || "";
	this.data = data;
}


/**
 * A persistent medium that maintains the structure of the graph created from the graphml file data.
 * @property {Object} graphData
 * @property {Integer} graphData.x, y - historical offset that would shift the graph's elements back to their serialized coordinates
 * @property {Integer} graphData.width - the width of the graph, by elements
 * @property {Integer} graphData.height - the height of the graph, by elements
 * @property {Integer} graphData.span - used for drawing the background lines
 * @property {String} id - the specific name of the graph, often set as the filename, and defaulted to "new"
 * @property {Object} graph - there can only be one graph on this paper
 * @property {Object} nodes - a map of all nodes on this graph
 * @property {String} id in nodes - the unique id of an node
 * @property {Node} nodes[id] - the unique node with the given id
 * @property {Object} edges - a map of all edges on this graph
 * @property {String} id in edges - the unique id of an edge
 * @property {Node} edges[id] - the unique edge with the given id
 * @property {Object} hyperedges - a map of all hyperedges on this graph
 * @property {String} id in hyperedges - the unique id of an hyperedge
 * @property {Node} hyperedges[id] - the unique hyperedge with the given id
 * @constructor
 * @param {String} id - The file name in which this graph data is stored or from which it was extracted
 * @param {Object} attributes - na
 * @param {Array[String]} attributes.namespaces - na
 * @param {XML} attributes.xml - na
 */
function GraphmlPaper(id, attributes) {
	var cattributes = attributes || {};
	
	this.id = id || "new";
	this.namespaces = {};
	this.graphmlAttributes = {};
	this.originalData = null;
	
	this.graph = null;
	this.nodes = {};
	this.edges = {};
	this.subgraphs = {};
	this.hyperedges = {};
	this.graphData = {
		x:0,
		y:0,
		width:0,
		height:0,
		span:25
	};
	
	if(cattributes.namespaces)
		this.setNamespaces(cattributes.namespaces);
	if(cattributes.graphmlAttributes)
		this.setGraphmlAttributes(cattributes.graphmlAttributes);
	if(cattributes.xml)
		this.unpackXML(cattributes.xml)
}

/**
 * Get the root of the graph structure.
 * @returns {Graph} a graph, or null if never set
 */
GraphmlPaper.prototype.getRootGraph = function() {
	return this.graph;
}

/**
 * Set the root of the graph structure.
 * If there is existing structure, discard it.
 * @param {Graph} the graph that will become the root of graph structure
 * @returns {Graph} the previous graph that was the root (and all associated elements)
 */
GraphmlPaper.prototype.setRootGraph = function(graph) {
	var oldGraph = this.graph;
	this.graph = graph;
	return oldGraph;
}

/**
 * Get all of the node elements in this graph structure.
 * @returns {Object} a live mapping of all of the nodes
 */
GraphmlPaper.prototype.getNodes = function() {
	var nodesOut = {};
	var graphs = [this.graph];
	for(var i = 0; i < graphs.length; i++) {
		var graph = graphs[i];
		var subgraphs = graph.getSubgraphs();
		for(var id in subgraphs)
			graphs.push(subgraphs[id]);
		var nodes = graph.getNodes();
		for(var id in nodes)
			nodesOut[id] = nodes[id];
	}
	return nodesOut;
}

/**
 * Set a new mapping of node elements for this graph structure.
 * Using this method can destroy the continuity of the graph structure, as existing node ids will no longer be associated with existing node elements.
 * @param {Object} nodes - a mapping of node ids to nodes
 * @returns {Object} a mapping of all of the previous node ids to nodes
 */
GraphmlPaper.prototype.setNodes = function(nodes) {
	var displacedNodes = this.nodes;
	this.nodes = nodes;
	return displacedNodes;
}

/**
 * Get a specific node element in this graph structure.
 * @param {String} id - the reference to the node
 * @returns {Node} the requested node
 */
GraphmlPaper.prototype.getNode = function(id) {
	var subgraphAddress = id.split("::");
	subgraphAddress.pop();
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	return graph.getNode(id);
}

/**
 * Set a specific node into the mapping of node elements with the given id.
 * Using this method can destroy the continuity of the graph structure, as existing node ids will no longer be associated with existing node elements.
 * @param {String} id - the reference to the node
 * @param {Node} node - the new node
 * @returns {Node} the previous node that belonged to this id, if any
 */
GraphmlPaper.prototype.setNode = function(id, node) {
	var subgraphAddress = id.split("::");
	subgraphAddress.pop();
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	if(node)
		return graph.addNode(id, node);
	else
		return graph.removeNode(id);
}

/**
 * Get all of the edge elements in this graph structure.
 * @returns {Object} a live mapping of all of the edges
 */
GraphmlPaper.prototype.getEdges = function() {
	var edgesOut = {};
	var graphs = [this.graph];
	for(var i = 0; i < graphs.length; i++) {
		var graph = graphs[i];
		var subgraphs = graph.getSubgraphs();
		for(var id in subgraphs)
			graphs.push(subgraphs[id]);
		var edges = graph.getEdges();
		for(var id in edges)
			edgesOut[id] = edges[id];
	}
	return edgesOut;
}

/**
 * Set a new mapping of edge elements for this graph structure.
 * Using this method can destroy the continuity of the graph structure, as existing edge ids will no longer be associated with existing edge elements.
 * @param {Object} edge - a mapping of edge ids to edges
 * @returns {Object} a mapping of all of the previous edge ids to edges
 */
GraphmlPaper.prototype.setEdges = function(edges) {
	var displacedEdges = this.edges;
	this.edges = edges;
	return displacedEdges;
}

/**
 * Get a specific edge element in this graph structure.
 * @param {String} id - the reference to the edge
 * @returns {Edge} the requested edge
 */
GraphmlPaper.prototype.getEdge = function(id) {
	var subgraphsAddress = id.split("::");
	subgraphAddress.pop();
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	return graph.getEdge(id);
}

/**
 * Set a specific edge into the mapping of edge elements with the given id.
 * Using this method can destroy the continuity of the graph structure, as existing edge ids will no longer be associated with existing edge elements.
 * @param {String} id - the reference to the edge
 * @param {Edge} edge - the new edge
 * @returns {Edge} the previous edge that belonged to this id, if any
 */
GraphmlPaper.prototype.setEdge = function(id, edge) {
	var subgraphAddress = id.split("::");
	subgraphAddress.pop();
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	if(edge)
		return graph.addEdge(id, edge);
	else
		return graph.removeEdge(id);
}

/**
 * Get all of the hyperedge elements in this graph structure.
 * @returns {Object} a live mapping of all of the hyperedges
 */
GraphmlPaper.prototype.getHyperedges = function() {
	var edgesOut = {};
	var graphs = [this.graph];
	for(var i = 0; i < graphs.length; i++) {
		var graph = graphs[i];
		var subgraphs = graph.getSubgraphs();
		for(var id in subgraphs)
			graphs.push(subgraphs[id]);
		var edges = graph.getHyperedges();
		for(var id in edges)
			edgesOut[id] = edges[id];
	}
	return edgesOut;
}

/**
 * Set a new mapping of hyperedge elements for this graph structure.
 * Using this method can destroy the continuity of the graph structure, as existing hyperedge ids will no longer be associated with existing hyperedge elements.
 * @param {Object} hyperedge - a mapping of hyperedge ids to hyperedges
 * @returns {Object} a mapping of all of the previous hyperedge ids to hyperedges
 */
GraphmlPaper.prototype.setHyperedges = function(hyperedges) {
	this.hyperedges = hyperedges;
}

/**
 * Get a specific hyperedge element in this graph structure.
 * @param {String} id - the reference to the hyperedge
 * @returns {Hyperedge} the requested hyperedge
 */
GraphmlPaper.prototype.getHyperedge = function(id) {
	var subgraphAddress = id.split("::");
	subgraphAddress.pop();
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	return graph.getHyperedge(id);
}

/**
 * Set a specific hyperedge into the mapping of hyperedge elements with the given id.
 * Using this method can destroy the continuity of the graph structure, as existing hyperedge ids will no longer be associated with existing hyperedge elements.
 * @param {String} id - the reference to the edge
 * @param {Hyperedge} hyperedge - the new hyperedge
 * @returns {Hyperedge} the previous hyperedge that belonged to this id, if any
 */
GraphmlPaper.prototype.setHyperedge = function(id, hyperedge) {
	var subgraphsAddress = id.split("::");
	var graph = this.graph;
	for(var i = 0, j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	if(hyperedge)
		return graph.addHyperedge(id, hyperedge);
	else
		return graph.removeHyperedge(id);
}

/**
 * Get all of the subgraph elements in this graph structure.
 * @returns {Object} a live mapping of all of the graphs
 */
GraphmlPaper.prototype.getSubgraphs = function() {
	var graphsOut = {};
	var graphs = [this.graph];
	for(var i = 0; i < graphs.length; i++) {
		var graph = graphs[i];
		var subgraphs = graph.getSubgraphs();
		for(var id in subgraphs) {
			var subgraph = subgraphs[id];
			graphs.push(subgraph);
			graphsOut[id] = subgraph;
		}
	}
	return graphsOut;
}
/**
 * For internal use only.
 */
GraphmlPaper.prototype.getGraphs = GraphmlPaper.prototype.getSubgraphs;

/**
 * Set a new mapping of subgraph elements for this graph structure.
 * Using this method can destroy the continuity of the graph structure, as existing subgraph ids will no longer be associated with existing graph elements.
 * @param {Object} graph - a mapping of hyperedge ids to hyperedges
 * @returns {Object} a mapping of all of the previous hyperedge ids to hyperedges
 */
GraphmlPaper.prototype.setSubgraphs = function(subgraphs) {
	var oldSubgraph = this.subgraphs;
	this.subgraphs = subgraphs;
	return oldSubgraph;
}
/**
 * For internal use only.
 */
GraphmlPaper.prototype.setGraphs = GraphmlPaper.prototype.setSubgraphs;

/**
 * Get a specific graph element in this graph structure.
 * @param {String} id - the reference to the graph
 * @returns {Graph} the requested graph
 */
GraphmlPaper.prototype.getSubgraph = function(id) {
	var subgraphAddress = id.split("::");
	var graph = this.graph;
	var i = 0;
	if(subgraphAddress[0] == "root" || subgraphAddress[0] == graph.getId())
		i = 1;
	
	for(var j = subgraphAddress.length; i < j; i++) {
		graph = graph.getSubgraph( subgraphAddress[i]+":");
		if(!graph)
			return null;
	}
	return graph;
}
/**
 * For internal use only.
 */
GraphmlPaper.prototype.getGraph = GraphmlPaper.prototype.getSubgraph;

/**
 * Set a specific graph into the mapping of graph elements with the given id.
 * Using this method can destroy the continuity of the graph structure, as existing graph ids will no longer be associated with existing graph elements.
 * @param {String} id - the reference to the graph
 * @param {Graph} subgraph - the new graph
 * @returns {Graph} the previous subgraph that belonged to this id, if any
 */
GraphmlPaper.prototype.setSubgraph = function(id, subgraph) {
	var subgraphAddress = id.split("::");
	var newGraphId = subgraphAddress.pop();
	var graph = this.graph;
	if(graph == null) {
		this.graph = subgraph;
		return null;
	}
	else {
		for(var i = 0, j = subgraphAddress.length; i < j; i++) {
			graph = graph.getSubgraph( subgraphAddress[i]+":");
			if(!graph)
				return null;
		}
		if(subgraph)
			return graph.addSubgraph(newGraphId, subgraph);
		else
			return graph.removeSubgraph(newGraphId);
	}
}
/**
 * For internal use only.
 */
GraphmlPaper.prototype.setGraph = GraphmlPaper.prototype.setSubgraph;

/**
 * Retrieve an element and useful information about the element from the displayed graph.
 * Although beyond the scope of the class, if an HTML element with the same id as the element exists, that is retrieved as well.
 * @param {String} id - The unique identifier of the graph element
 * @returns {Object} obj - na
 * @returns {Object} obj.id - the unique identifier of the graph element (not repeated from parameter)
 * @returns {Number} obj.x - the x-coordinate of the element relative to the origin of the graph
 * @returns {Number} obj.y - the y-coordinate of the element relative to the origin of the graph
 * @returns {String} obj.type - the Graphml type of element that was recovered (Node, Edge, Hyperedge)
 * @returns {String} obj.ns - the namespace URI that the element's representation uses
 * @returns {String} obj.nstype - the namespace-scoped type of element's representation
 * @returns {Object} obj.elem - the elem recovered from the graph's data
 * @returns {DOMElement} obj.dom - the onscreen element recovered from the HTML document
 */
GraphmlPaper.prototype.getGraphElement = function(id) {
	var elem = null;
	for(var i = 0, getCategoryFuncs = ["getNodes", "getEdges", "getHyperedges"]; i < 3; i++) {
		var elems = GraphmlPaper.prototype[getCategoryFuncs[i]].call(this);
		if(id in elems) {
			elem = elems[id];
			break;
		}
	}
	if(!elem) // Can not find the element by id
		return null;
	
	var elemRep = elem.getRepresentation();
	var obj = {};
	obj.id = elem.getId();
	obj.x = 0;
	obj.y = 0;
	obj.type = elem.constructor.name;
	obj.ns = "";
	obj.nstype = elemRep && elemRep.constructor.name;
	obj.elem = elem;
	obj.dom = document && document.getElementById(id); // If this element is being depicted
	if(elemRep) { // Elem has visualization and a coordinate location on the graph
		var namespaces = this.getNamespaces();
		var elemRepConstructor = elemRep.constructor;
		var nstype = obj.nstype;
		for(var uri in namespaces) {
			if(namespaces[uri].getSpecificClass(nstype) === elemRepConstructor) {
				obj.ns = uri;
				break;
			}
		}
		var elemBounds = elem.getBounds();
		obj.x = this.graphData.x + elemBounds.x;
		obj.y = this.graphData.y - elemBounds.y;
	}
	return obj;
}

/**
 * Get all of the namespaces used in this graph structure.
 * @returns {Object} a live mapping of all of the namespaces
 */
GraphmlPaper.prototype.getNamespaces = function() {
	return this.namespaces;
}

/**
 * Set a new mapping of namespaces used in this graph structure.
 * @param {Object} nspaces - a mapping of namespace schema to namespaces
 * @returns {Object} a mapping of all of the previous namespace schema to namespaces
 */
GraphmlPaper.prototype.setNamespaces = function(nspaces) {
	if(nspaces) {		
		var namespaces = this.namespaces;
		for(var id in nspaces) {
			if(nspaces[id]) {
				this.setNamespace(id, nspaces[id]);
			}
			else {
				delete this.namespaces[id];
			}
			// TODO: remember why this line was left blank	
		}
	}
}

/**
 * Get a specific namespace used in this graph structure.
 * @param {String} id - the uri used by the namespace
 * @returns {GraphmlNamespace} the requested namespace
 */
GraphmlPaper.prototype.getNamespace = function(id) {
	return this.namespaces[id];
}

/**
 * Set a specific namespace into the mapping of namespace elements with the given id.
 * @param {String} id - the reference to the namespace
 * @param {GraphmlNamespace} nspace - the new namespace
 * @returns {GraphmlNamespace} the previous namespace that belonged to this id, if any
 */
GraphmlPaper.prototype.setNamespace = function(id, nspace) {
	var namespaces = this.namespaces;
	var entry = namespaces[id];
	namespaces[id] = nspace;
}

/**
 * Get all of the graphml attributes used by this graph structure.
 * @returns {Object} a live mapping of all of the attributes
 */
GraphmlPaper.prototype.getGraphmlAttributes = function(obj) {
	return this.graphmlAttributes;
}

/**
 * Set a new mapping of graphml attributes used by this graph structure.
 * @param {Object} obj - a mapping of attribute identifiers to attributes
 * @returns {Object} a mapping of all of the previous attribute identifiers to attributes
 */
GraphmlPaper.prototype.setGraphmlAttributes = function(obj) {
	if(obj) {
		var graphmlAttributes = this.graphmlAttributes;
		for(var id in obj) {
			if(obj[id]) {
				this.setGraphmlAttribute(id, obj[id]);
			}
			else {
				delete this.graphmlAttributes[id];
			}
			// TODO: remember why this line was left blank	
		}
	}
}

/**
 * Get a specific graphml attribute used by this graph structure.
 * @param {String} id - the schema used by the namespace
 * @returns {GraphmlNamespace} the requested namespace
 */
GraphmlPaper.prototype.getGraphmlAttribute = function(id) {
	return this.graphmlAttributes[id];
}

/**
 * Set a specific graphml attribute into the mapping of attributes with the given id.
 * @param {String} id - the id reference to the attribute
 * @param {Object} attribute - the new attribute
 * @returns {Object} the previous attribute that belonged to this id, if any
 */
GraphmlPaper.prototype.setGraphmlAttribute = function(id, attribute) {
	var graphmlAttributes = this.graphmlAttributes;
	var entry = graphmlAttributes[id];
	graphmlAttributes[id] = attribute;
}

/**
 * Get the data that asists formatting the current graph.
 * @returns {Object} canvas-graph exclusive information
 */
GraphmlPaper.prototype.getGraphData = function() {
	return this.graphData;
}

/**
 * Set the data that asists formatting the current graph.
 * @param {Object} newData - canvas-graph exclusive information, contents optional but filtered on being set individually
 */
GraphmlPaper.prototype.setGraphData = function(newData) {
	var data = this.graphData;
	if("x" in newData)
		data.x = newData.x;
	if("y" in newData)
		data.y = newData.y;
	if("width" in newData)
		data.width = newData.width;
	if("height" in newData)
		data.height = newData.height;
	if("span" in newData)
		data.span = newData.span;
}

/**
 * Get the width of the graph.
 * The basic width of the graph is the distance from the x-coordinate of the left-most element across to the right side of the right-most element.
 * @param {GraphmlCanvas} canvas - optional; if passed, the full width of the graph, as if it were depicted on this canvas, is calculated
 * @returns {Number} the width of the resulting graph
 */
GraphmlPaper.prototype.getWidth = function(canvas) {
	var width = this.graphData.width;
	if(!canvas)
		return width;
	else {
		var cdata = canvas.getGraphData();
		var czoom = cdata.zoom;
		var cWidth = canvas.getWidth() - 17;
		var paddedWidth = czoom * (width + cdata.pad*2);
		return paddedWidth > cWidth ? paddedWidth : cWidth;
	}
}

/**
 * Get the height of the graph.
 * The basic height of the graph is the distance from the y-coordinate of the top-most element down to the base of the bottom-most element.
 * @param {GraphmlCanvas} canvas - optional; if passed, the full height of the graph, as if it were depicted on this canvas, is calculated
 * @returns {Number} the height
 */
GraphmlPaper.prototype.getHeight = function(canvas) {
	var height = this.graphData.height;
	if(!canvas)
		return height;
	else {
		var cdata = canvas.getGraphData();
		var czoom = cdata.zoom;
		var cHeight = canvas.getHeight() - 20;
		var paddedHeight = czoom * (height + cdata.pad*2);
		return paddedHeight > cHeight ? paddedHeight : cHeight;
	}
}

/**
 * Draw all elements of this graph structure on the canvas.
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 */
GraphmlPaper.prototype.draw = function(canvas) {
	if(!canvas) {
		console.log("Must draw this graph on a canvas.");
		return;
	}
	canvas.clearBackgroundLayer();
	canvas.clearContentLayer();
	var root = this.getRootGraph();
	if(!root) {
		this.drawBackground(canvas);
		return;
	}
	
	this.drawGraph(canvas, root);
	canvas.center(); // The call to center() draws the background
}

/**
 * na
 * @private
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 * @param {Graph} graph - the subgraph whose node elements are currently be drawn
 */
GraphmlPaper.prototype.drawGraph = function(canvas, graph) {
	this.drawNodes(canvas, graph);
	this.drawEdges(canvas, graph);
	this.drawHyperedges(canvas, graph);
	
	var subgraphs = graph.getSubgraphs();
	for(var id in subgraphs)
		this.drawGraph(canvas, subgraphs[id]);
}

/**
 * Draw all nodes on this paper in order of the subgraph organization.
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 * @param {Graph} subgraph - the subgraph whose node elements are currently be drawn
 */
GraphmlPaper.prototype.drawNodes = function(canvas, subgraph) {
	var gid = subgraph.getId();
	var localNodes = subgraph.getNodes();
	for(var id in localNodes) {
		var localNode = localNodes[id];
		canvas.setToContentLayer( localNode.createElement(), gid );
	
		/* var subgraphs = localNode.getSubgraphs();
		for(var id in subgraphs)
			this.drawGraph(canvas, subgraphs[id]);*/
	}
}

/**
 * Draw all edges on this paper (in order of the subgraph organization?).
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 * @param {Graph} subgraph - the subgraph whose edge elements are currently be drawn
 */
GraphmlPaper.prototype.drawEdges = function(canvas, subgraph) {
	var gid = subgraph.getId();
	var localEdges = subgraph.getEdges();
	for(var id in localEdges)
		canvas.setToContentLayer( localEdges[id].createElement(), gid );
}

/**
 * Draw all hyperedges on this paper ( in order of the subgraph organization?).
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 * @param {Graph} subgraph - the subgraph whose hyoperedge elements are currently be drawn
 */
GraphmlPaper.prototype.drawHyperedges = function(canvas, subgraph) {
	var gid = subgraph.getId();
	var localHyperedges = subgraph.getHyperedges();
	for(var id in localHyperedges)
		canvas.setToContentLayer( localHyperedges[id].createElement(), gid );
}

/**
 * Create the default background to fit into the graph space on the canvas.
 * @param {GraphmlCanvas} canvas - the canvas onto which this graph is being drawn
 */
GraphmlPaper.prototype.drawBackground = function(canvas) {
	if(!canvas) {
		console.log("Must draw this graph on a canvas.");
		return;
	}
	var graphData = this.getGraphData();
	var canvasData = canvas.getGraphData();
	
	var zoomFactor = canvasData.zoom;
	var lineHorSpan = graphData.span * zoomFactor;
	var lineVerSpan = graphData.span * zoomFactor;
	var x0 = canvasData.x + graphData.x;
	var y0 = canvasData.y + graphData.y;
	var startX = x0 % lineHorSpan; // Combine centering offset of graph elements and scroll offset of graph
	var startY = y0 % lineVerSpan;
	
	var gridListHor = "", gridListVer = "";
	var graphWidth = canvas.getHorizontalCanvasSpace();
	var graphHeight = canvas.getVerticalCanvasSpace();
	for(var i = startX, j = graphHeight; i <= graphWidth; i += lineHorSpan)
		gridListHor += " M "+(i)+" 0 L "+(i)+" "+(j);
	for(var i = startY, j = graphWidth; i <= graphHeight; i += lineVerSpan)
		gridListVer += " M 0 "+(i)+" L "+(j)+" "+(i);
	
	var svgns = "http://www.w3.org/2000/svg";
	var svg = document.createElementNS(svgns, "svg"), path, style;
	svg.setAttributeNS(null, "width", graphWidth);
	svg.setAttributeNS(null, "height", graphHeight);
	
	path = document.createElementNS(svgns, "path");
	path.id = "background_horizontal_lines";
	path.setAttributeNS(null, "d", gridListHor);
	style = path.style;
	style.fill = "none";
	style.stroke = "#006666";
	style["stroke-width"] = 0.25;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path");
	path.id = "background_vertical_lines";
	path.setAttributeNS(null, "d", gridListVer);
	style = path.style;
	style.fill = "none";
	style.stroke = "#009999";
	style["stroke-width"] = 0.25;
	svg.appendChild(path);
	
	//debug
	var center = canvas.getGraphCenterCoordinates();
	var line = document.createElementNS(svgns, "line");
	line.setAttributeNS(null, "x1", 0);
	line.setAttributeNS(null, "x2", graphWidth);
	line.setAttributeNS(null, "y1", y0);
	line.setAttributeNS(null, "y2", y0);
	style = line.style;
	style.fill = "none"
	style.stroke = "blue";
	svg.appendChild(line);
	
	line = document.createElementNS(svgns, "line");
	line.setAttributeNS(null, "x1", x0);
	line.setAttributeNS(null, "x2", x0);
	line.setAttributeNS(null, "y1", 0);
	line.setAttributeNS(null, "y2", graphHeight);
	style = line.style;
	style.fill = "none"
	style.stroke = "blue";
	svg.appendChild(line);
	
	canvas.setToBackgroundLayer(svg);
}