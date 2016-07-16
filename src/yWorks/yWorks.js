/**
 * Create and populate the namespace.
 */
var classList = [
				"yWorksRepresentation.js",
				"UMLClassNode.js",
				"UMLNoteNode.js",
				"ShapeNode.js",
				"GenericNode.js",
				"SVGNode.js",
				"GenericNode.js",
				"ProxyAutoBoundsNode.js",
				"TableNode.js",
				"PolyLineEdge.js",
				"Resources.js"
];
yWorks = new GraphmlNamespace("http://www.yworks.com/xml/graphml", { classList:classList });


/**
 * The entry point for setting up the nodes from their data.
 * The yWorks namespace is fleshed out enough that certain actions are necessary to properly compose the graph elements for displaying in HTML.
 * @override
 */
yWorks.setup = function(canvas, graph, xml, attributes) {
	yWorks.handleComplexData(graph);
	yWorks.setElementsInView(graph);
	yWorks.clipEdgeEndpointsToNodes(canvas, graph);
	yWorks.allocateSVGResources(graph);
}

/**
 * Convert graphml attribute data that transforms into namespace-specific class objects.
 * @private
 * @static
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
yWorks.handleComplexData = function(graph) {
	var header = graph.getHeader();
	var graphmlAttributes = graph.getGraphmlAttributes();
	// Construct element visuals
	for(var i = 0, elems = ["graph","node","edge","hyperedge"], j = elems.length; i <j; i++) {
		var elemId = elems[i];
		var elemAttributes = graphmlAttributes["for"][elemId];
		for(var id in elemAttributes) {
			var type = elemAttributes[id]["yfiles.type"];
			if(type && type.search("graphics") > -1) {
				var list = graph["get"+elemId[0].toUpperCase()+elemId.slice(1)+"s"]();
				yWorks.buildRepresentation(list, id);
				break;
			}
		}
	}
	// Construct additional resource picker
	var elemAttributes = graphmlAttributes["for"]["graphml"];
	for(var id in elemAttributes) {
		var type = elemAttributes[id]["yfiles.type"];
		var data = graph[id];
		if(type && type.search("resources") > -1) {
			var resourceClass = GraphmlNamespace.get(data.uri).getSpecificClass(data.className);
			if(resourceClass)
				graph[id] = new resourceClass({xml:data.xml});
		}
	}
}

/**
 * Construct namespace-specific visual representations of the graph elements.
 * @private
 * @static
 * @param {Object} elemMap - a mapping of GraphmlElement ids to elements
 * @param {String} repId - the key id of the graphml attribute that holds the representation data for this graph's elements
 */
yWorks.buildRepresentation = function(elemMap, repId) {
	for(var id in elemMap) {
		var elem = elemMap[id];
		var elemType = elem.constructor.name.toLowerCase();
		var eid = elem.getId();
		var graphicsElement = elem[repId];
		if(!graphicsElement || graphicsElement.uri != yWorks.getNamespaceURI())
			continue;
		var repClass = yWorks.getSpecificClass(graphicsElement.className);
		if(!repClass) {
			console.log("yWorks: "+elemType+" "+eid+" asked for unsupported object "+graphicsElement.className);
			continue;
		}
		var attributes = elem.getAttributes();
		try {
			var representation = new repClass(eid, attributes);
			elem.setRepresentation(representation);
		}
		catch(err) {
			if(!graphicsElement.xml)
				console.log("yWorks: "+elemType+" "+eid+" tried to parse xml data but there was no data");
			else if(!representation)
				console.log("yWorks: "+elemType+" "+eid+" could not build a working "+graphicsElement.className+" parser - "+err.message);
			else
				console.log("yWorks: "+elemType+" "+eid+" encountered a strange error - "+err.message);
		}
	}
}

/**
 * Ensure that all elements on the graph are positioned within bounds.
 * @private
 * @static
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
yWorks.setElementsInView = function(graph) {
	var nodes = graph.getNodes();
	var edges = graph.getEdges();
	var lowerx = Infinity, lowery = Infinity, upperx = -Infinity, uppery = -Infinity;
	
	for(var id in nodes) { // Iterate over nodes and determine if any are positioned off page to the left or top
		var data = nodes[id].getRepresentation();
		if(!data)
			continue;
		data = data.getBounds();
		var x = data.x, y = data.y, xw = x + data.width, yh = y + data.height;
		if(x < lowerx)
			lowerx = x;
		if(y < lowery)
			lowery = y;
		if(xw > upperx)
			upperx = xw;
		if(yh > uppery)
			uppery = yh;
		var labels = data.labels || [];
		for(var i = 0, j = labels.length; i < j; i++) { // Certain nodes have labels with their own dimensions
			var nx = labels[i].x, ny = labels[i].y, nxw = nx + labels[i].width, nyh = ny + labels[i].height;
			if(nx < lowerx)
				lowerx = nx;
			if(ny < lowery)
				lowery = ny;
			if(nxw > upperx)
				upperx = nxw;
			if(nyh > uppery)
				uppery = nyh;
		}
	}
	for(var id in edges) { // Iterate over edges and determine if any are positioned off page to the left or top
		var data = edges[id].getRepresentation();
		if(!data)
			continue;
		data = data.getAttributes();
		var points = data.points;
		for(var i = 0, j = points.length; i < j; i++) {
			var point = points[i];
			if(point.x < lowerx)
				lowerx = point.x;
			if(point.x > upperx)
				upperx = point.x;
			if(point.y < lowery)
				lowery = point.y;
			if(point.y > uppery)
				uppery = point.y;
			// TODO: edges can also have labels; currently we don't account for them, though
		}
	}
	if(lowerx == Infinity)
		lowerx = 0;
	if(lowery == Infinity)
		lowery = 0;
	if(upperx == -Infinity)
		upperx = 0;
	if(uppery == -Infinity)
		uppery = 0;
	
	var graphData = graph.getGraphData();
	graphData.x = -lowerx;
	graphData.y = -lowery;
	graphData.width = (upperx - lowerx);
	graphData.height = (uppery - lowery);
	
	yWorks.shiftElements(graph, -lowerx, -lowery); // Shift everything within a positive buffer region for the purposes of scrolling
}

/**
 * Move all graphml elements' coordinates by the specified amount.
 * @private
 * @static
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 * @param {Number} dx - how far to move the elements in the x-axis direction
 * @param {Number} dy - how far to move the elements in the y-axis direction
 */
yWorks.shiftElements = function(graph, dx, dy) {
	if(dx == 0 && dy == 0)
		return;
	
	var elems = [graph.getNodes(), graph.getEdges(), graph.getHyperedges()];
	for(var i = 0, j = elems.length; i < j; i++) {
		var elementMap = elems[i];
		for(var id in elementMap) {
			var data = elementMap[id].getRepresentation();
			if(!data)
				continue;
			data.shift(dx, dy);
		}
	}
}

/**
 * Perform adjustments to the elements to finish configuring them for display.
 * Currently, the only major tasking this function performs is aligning the ultimate endpoints of edge elements to the sides of nodes.
 * @private
 * @static
 * @param {GraphmlCanvas} canvas - the drawing surface controlling (access to) the HTML components through Javascript
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
yWorks.clipEdgeEndpointsToNodes = function(canvas, graph) {
	var nodes = graph.getNodes();
	var edges = graph.getEdges();
	
	for(var id in edges) { // Fine tune the data that will create the edge lines
		var edge = edges[id];
		var data = edge.getRepresentation();
		if(!data)
			continue;
		data = data.getAttributes();
		
		// 1. Get the source and target node and their centers
		var snode = nodes[data.src].getRepresentation().getAttributes().geometry;
		var sx = snode.x + snode.width/2 + data.path.sx;
		var sy = snode.y + snode.height/2 + data.path.sy;
		var tnode = nodes[data.tgt].getRepresentation().getAttributes().geometry;
		var tx = tnode.x + tnode.width/2 + data.path.tx;
		var ty = tnode.y + tnode.height/2 + data.path.ty;
		var endpoints = data.endpoints = {source:{x:sx, y:sy}, target:{x:tx, y:ty}};
		
		// 2. Find the width and the height of the element to be created
		var dx, dy, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
		if(sx < minx)
			minx = sx;
		if(sx > maxx)
			maxx = sx;
		if(sy < miny)
			miny = sy;
		if(sy > maxy)
			maxy = sy;
		if(tx < minx)
			minx = tx;
		if(tx > maxx)
			maxx = tx;
		if(ty < miny)
			miny = ty;
		if(ty > maxy)
			maxy = ty;
		var points = data.points;
		for(var i = 0, j = points.length; i < j; i++) {
			var point = points[i];
			if(point.x < minx)
				minx = point.x;
			if(point.x > maxx)
				maxx = point.x;
			if(point.y < miny)
				miny = point.y;
			if(point.y > maxy)
				maxy = point.y;
		}
		var geometry = data.geometry = {};
		geometry.x = minx;
		geometry.y = miny;
		geometry.width = maxx;
		geometry.height = maxy;
		
		// 3. Truncate the ends of the lines so that terminate at the nodes properly
		var obj = yWorks.clipEndpoint(graph, "source", data);
		if(obj != null) {
			endpoints.source.x = obj.x;
			endpoints.source.y = obj.y;
		}
		var obj = yWorks.clipEndpoint(graph, "target", data);
		if(obj != null) {
			endpoints.target.x = obj.x;
			endpoints.target.y = obj.y;
		}
	}
}

/**
 * na
 * @private
 * @static
 * @param {GraphmlCanvas} canvas - the drawing surface controlling (access to) the HTML components through Javascript
 * @param {String} side - either specifying the "source" endpoint or the "target" endpoint of the edge
 * @param {Object} data - information regarding the entirety of the edge
 * @returns {Object} this object contains the coordinates for the new specified terminus of the edge, or is null
 */
yWorks.clipEndpoint = function(graph, side, data) {
	var x1, y1; // The endpoint opposite the one specified in the parameters
	if(side == "source") {
		var point = data.points[0];
		if(point) {
			x1 = point.x;
			y1 = point.y;
		}
		else {
			x1 = data.endpoints.target.x;
			y1 = data.endpoints.target.y;
		}
	}
	else if(side == "target") {
		var point = data.points[data.points.length-1];
		if(point) {
			x1 = point.x;
			y1 = point.y;
		}
		else {
			x1 = data.endpoints.source.x;
			y1 = data.endpoints.source.y;
		}
	}
	else // Error checking, in case side data was passed incorrectly
		return null;
	
	var endpoints = data.endpoints[side];
	var x0 = endpoints.x;
	var y0 = endpoints.y;
	
	var bounds = graph.getNode(data[side == "source" ? "src" : "tgt"]).getRepresentation().getAttributes().geometry;
	var x2 = +bounds.x;
	var y2 = +bounds.y;
	var x3 = x2 + bounds.width;
	var y3 = y2 + bounds.height;
	var dat = [ [x0,y0, x1,y1, x2,y2, x2,y3],
				[x0,y0, x1,y1, x2,y3, x3,y3],
				[x0,y0, x1,y1, x3,y3, x3,y2],
				[x0,y0, x1,y1, x3,y2, x2,y2]]; // Array of Arrays of coordinates describing the edge (0-1) and the decomposed perimeter of the Node (2-3)
	
	var intersection = null;
	for(var i = 0, j = 4; i < j; i++) {
		var rtn = yWorks.linearIntersect.apply(yWorks, dat[i]);
		if(rtn.intersects) {
			if(intersection) {
				if(rtn.x == intersection.x && rtn.y == intersection.y) // If the same point is encountered, assume a corner, and overlook
					continue;
				return null; // TODO: a valid condition still exists here - the endpoint of edge 0-1 is on one of the boundary lines 2-3
			}
			intersection = rtn;
		}
	}
	return intersection;
}

/**
 * Apply the basic linear intersection equation to determine if a point exists on both lines.
 * Special number interactions are applied to simplify the process using boolean comparisons.
 * @private
 * @static
 * @param {Number} ax, ay - the coordinates of the first segment's first point
 * @param {Number} bx, by - the coordinates of the first segment's second point
 * @param {Number} cx, cy - the coordinates of the second segment's first point
 * @param {Number} dx, dy - the coordinates of the second segment's second point
 * @return {Object} rtn
 * @return {Boolean} rtn.intersects - required; true, if the lines intersect; false, otherwise
 * @return {Number} rtn.x, rtn.y - if there is an intersection, these are the coordinates of that point
 */
yWorks.linearIntersect = function(ax, ay, bx, by, cx, cy, dx, dy) {
/*
 * 1. Find the coordinate change in the lines:
 *		bax = bx - ax
 *		bay = by - ay
 *		dcx = dx - cx
 *		dcy = dy - cy
 *		a[x,y] + <bax,bay> = b[x,y]
 *		c[x,y] + <dcx,dcy> = d[x,y]
 * 2. S and T are different factors in the range of 0...1 that mark a point on both lines:
 *		a[x,y] + S<bax,bay> = c[x,y] + T<dcx,dcy>
 *		S<bax,bay> - T<dcx,dcy> = c[x,y] - a[x,y]
 *		S<bax>,S<bay> - T<dcx>,T<dcy> = [rx = cx - ax, ry = cy - ay]
 *		S<bax> - T<dcx> = rx
 *		S<bay> - T<dcy> = ry
 * 3. Make S<bay> in the x-equation equal to S<bax> in the y-equation:
 *		rn = bax/bay
 * 		S*bay*(bax/bay) - T*dcy*rn = ry*rn
 *		S*bax - T*dcy*rn = ry*rn
 * 4. Subtract the y-equation from the x-equation:
 *		S*bax - T*dcx = rx
 *		-S*bax +T*dcy*rn = -ry*rn
 *		-----------------------
 *		-T*dcx + T*dcy*rn = rx - ry*rn
 * 5. Solve for T:
 *		T * (dcy*rn - dcx) = rx - ry*rn
 *		T = (rx - ry*rn) / (dcy*rn - dcx)
 */
	var bax = bx - ax;
	var bay = by - ay;
	var dcx = dx - cx;
	var dcy = dy - cy;
	if(bax*dcy == bay*dcx) { // Both lines are parallel
		if((ax == cx && ay == cy) || (ax == dx && ay == dy)) // First point of the first line is the intersection point
			return {intersects:true, x:ax, y:ay};
		else if((bx == cx && by == cy) || (bx == dx && by == dy)) // Second point of the first line is the intersection point
			return {intersects:true, x:bx, y:by};
		// TODO: what if the parallel lines are partially coincidental (overlap)?
		/*
		else if((cy - ay)*(ax - dx) == (cx - ax)*(ay - dy)) // First point of first line lies on the coincidental second line
			return {intersect:true, x:ax, y:ay};
		else if((cy - by)*(bx - dx) == (cx - bx)*(by - dy)) // Second point of first line lies on the coincidental second line
			return {intersect:true, x:bx, y:by};
		else if((ay - cy)*(cx - bx) == (ax - cx)*(cy - by)) // First point of second line lies on the coincidental first line
			return {intersect:true, x:cx, y:cy};
		else if((ay - dy)*(dx - bx) == (ax - dx)*(dy - by)) // Second point of second line lies on the coincidental first line
			return {intersect:true, x:dx, y:dy};
		*/
		return {intersects:false};
	}
	
	var rx = cx - ax;
	var ry = cy - ay;
	var T = undefined; // Find T
	if(bax == 0) // The first line is vertical, so try: -T<dcx> = rx; the x-coordinate of the intersection point must be ax
		T = -rx/dcx;
	else if(bay == 0) // The first line is horizontal, so try: -T<dcy> = ry; the y-coordinate of the intersection point must be ay
		T = -ry/dcy;
	else if(dcx == 0) { // The second line is vertical, so try: S<bax> = rx, then plug for T; the x-coordinate of the intersection point must be cx
		var S = rx/bax;
		T = (S*bay - ry) / dcy;
	}
	else if(dcy == 0) { // The second line is horizontal, so try: S<bay> = ry, then plug for T; the y-coordinate of the intersection point must be cy
		var S = ry/bay;
		T = (S*bax - rx) / dcx;
	}
	else { // Neither line is perfectly vertical or horizontal, so proceed with the above outline from step 3.
		var rn = bax/bay;
		T = (rx - ry*rn) / (dcy*rn - dcx);
	}
	
	if(0 > T || T > 1) // T must be constrained to the span between cx,cy and dx,dy
		return {intersects:false};
	var intersectx = cx + T*dcx;
	if(bax != 0) {
		var tryS = (intersectx - ax)/bax;
		if(0 > tryS || tryS > 1) // "S" must be constrained to the span between ax and bx
			return {intersects:false};
	}
	var intersecty = cy + T*dcy;
	if(bay != 0) {
		var tryS = (intersecty - ay)/bay;
		if(0 > tryS || tryS > 1) // "S" must be constrained to the span between ay and by
			return {intersects:false};
	}
	return {intersects:true, x:intersectx, y:intersecty};
}

/**
 * Extract SVG resources embedded at the yWorks graphml data and assign it to appropriate SVGNodes
 * @private
 * @static
 * @param {Graph} graph - the structure that contains all of the deployed graphml node data
 */
yWorks.allocateSVGResources = function(graph) {
	var resId = null;
	var attributes = graph.getGraphmlAttributes()["for"]["graphml"];
	for(var id in attributes) {
		if(attributes[id]["yfiles.type"] == Resources["yfiles.type"]) {
			resId = id;
			break;
		}
	}
	var resources = graph[resId];
	if(!resources)
		return;
	
	var nodes = graph.getNodes(); // SVG-type Node elements interleaved with other elements
	for(var id in nodes) {
		var node = nodes[id];
		if(node.getRepresentationName() == "SVGNode") {
			var rep = node.getRepresentation();
			var resNum = (+rep.getRefid()) - 1; // Cast
			var content = resources.getResource(resNum);
			if(content)
				rep.setRef(content);
		}
	}
}

/**
 * Apply the yWorks background to the graph.
 * @private
 * @static
 * @param {GraphmlCanvas} canvas - the canvas of the graph onto which the background is being drawn
 * @param {Object} attributes - other data pertinent to the drawing process
 */
yWorks.drawBackground = function(canvas, attributes) {
	if(!canvas) {
		console.log("Must draw this background on a canvas.");
		return;
	}
	var graph = canvas.getGraph();
	if(!graph) {
		console.log("The canvas does not have an assigned graph.");
		return;
	}
	attributes = attributes || {};
	var graphData = graph.getGraphData();
	var canvasData = canvas.getGraphData();
	
	var zoomFactor = canvasData.zoom;
	var lineHorSpan = graphData.span * zoomFactor;
	var lineVerSpan = graphData.span * zoomFactor;
	var startX = (graphData.x + canvasData.x) % lineHorSpan; // Combine centering offset of graph elements and scroll offset of graph
	var startY = (graphData.y + canvasData.y) % lineVerSpan;
	
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
	
	canvas.setToBackgroundLayer(svg);
}

/**
 * Extract basic data from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {XML} xml - the original markup of this element
 */
yWorks.getCommonFields = function(attributes, xml) {
	var g;
	var yuri = yWorks.getNamespaceURI();
	g = xml.getElementsByTagNameNS(yuri, "Geometry")[0];
	attributes.geometry = {};
	attributes.geometry.x = +g.getAttribute("x");
	attributes.geometry.y = +g.getAttribute("y");
	attributes.geometry.width = +g.getAttribute("width");
	attributes.geometry.height = +g.getAttribute("height");
	g = xml.getElementsByTagNameNS(yuri, "Fill")[0];
	attributes.fill = {};
	attributes.fill.hasColor = g.getAttribute("hasColor") == "true";
	attributes.fill.color = g.getAttribute("color");
	attributes.fill.color2 = g.getAttribute("color2");
	attributes.fill.transparent = g.getAttribute("transparent") == "true";
	g = xml.getElementsByTagNameNS(yuri, "BorderStyle")[0];
	attributes.borderStyle = {};
	attributes.borderStyle.hasColor = g.getAttribute("hasColor") == "true";
	attributes.borderStyle.borderColor = g.getAttribute("color") || "none";
	attributes.borderStyle.borderStyle = g.getAttribute("type");
	attributes.borderStyle.borderWidth = +g.getAttribute("width");
}

/**
 * Extract data related to visualization customization from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {XML} xml - the original markup of this element
 */
yWorks.getStyleProperties = function(attributes, xml) {
	var yuri = yWorks.getNamespaceURI();
	var styles = attributes.styleProperties = {};
	var g = xml.getElementsByTagNameNS(yuri, "StyleProperties")[0];
	if(g) {
		g = g.getElementsByTagNameNS(yuri, "Property");
		for(var i = 0, j = g.length; i < j; i++) {
			var name = g[i].getAttribute("name");
			var value = g[i].getAttribute("value");
			styles[name] = value;
		}
	}
}

/**
 * Extract data related to text labels from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {Array[Object]} attributes.labels - na
 * @param {Number} i in attributes labels - index of the labels extracted from the XML/1998/namespace
 * @param {Object} attributes.labels[i] - the data that formats a single text label (hitherto, "obj")
 * @param {String} obj.content - na
 * @param {Number} obj.x - na
 * @param {Number} obj.y - na
 * @param {Number} obj.width - na
 * @param {Number} obj.height - na
 * @param {Boolean} obj.visible - na
 * @param {Boolean} obj.hasBackgroundColor - na
 * @param {String} obj.color1 - na
 * @param {Boolean} obj.hasLineColor - na
 * @param {String} obj.lineColor - na
 * @param {String} obj.align - na
 * @param {Boolean} obj.autoSizePolicy - na
 * @param {String} obj.fontFamily - na
 * @param {Number} obj.fontSize - na
 * @param {String} obj.fontColor - na
 * @param {Boolean} obj.underlined - na
 * @param {String} obj.align - na
 * @param {XML} xml - the original markup of this element
 */
yWorks.getLabels = function(attributes, xml) {
	var labels = attributes.nodeLabels;
	if(!labels)
		labels = attributes.nodeLabels = [];
	
	var x = attributes.x || 0;
	var y = attributes.y || 0;
	if(!("x" in attributes) && attributes.geometry) {
		x = attributes.geometry.x;
		y = attributes.geometry.y;
	}
	var yuri = yWorks.getNamespaceURI();
	var nodeLabels = xml.getElementsByTagNameNS(yuri, "NodeLabel");
	for(var i = 0, j = nodeLabels.length; i < j; i++) {
		var label = nodeLabels[i];
		var note = {};
		note.content = null;
		if(label.firstChild && label.firstChild.nodeValue)
			note.content = label.firstChild.nodeValue;
		
		note.x = +label.getAttribute("x") + x;
		note.y = +label.getAttribute("y") + y;
		note.width = +label.getAttribute("width");
		note.height = +label.getAttribute("height");
		
		note.visible = label.getAttribute("visible") == "true";
		note.hasBackgroundColor = label.getAttribute("hasBackgroundColor") == null;
		note.color1 = note.hasBackgroundColor ? label.getAttribute("backgroundColor") : "none";
		note.hasLineColor = label.getAttribute("hasLineColor") == null;
		note.lineColor = note.hasLineColor ? label.getAttribute("lineColor") : "none";
		
		note.textAlign = label.getAttribute("alignment");
		note.fontFamily = label.getAttribute("fontFamily");
		note.fontSize = +label.getAttribute("fontSize");
		note.fontStyle = label.getAttribute("fontStyle");
		note.fontColor = label.getAttribute("textColor");
		note.underlined = label.getAttribute("underlinedText") == "true";
		
		note.autoSizePolicy = label.getAttribute("autoSizePolicy");
		note.modelName = label.getAttribute("modelName");
		note.rotationAngle = +label.getAttribute("rotationAngle");
		
		var g = label.getElementsByTagNameNS(yuri, "SmartNodeLabelModel")[0];
		if(g) {
			note.labelModel = { smartNodeLabelModel:{} };
			note.labelModel.smartNodeLabelModel.distance = +g.getAttribute("distance");
		}
		
		g = label.getElementsByTagNameNS(yuri, "SmartNodeLabelModelParameter")[0];
		if(g) {
			note.modelParameter = { smartNodeLabelModelParameter:{} };
			var field = note.modelParameter.smartNodeLabelModelParameter;
			field.labelRatioX = +g.getAttribute("labelRatioX");
			field.labelRatioY = +g.getAttribute("labelRatioY");
			field.nodeRatioX = +g.getAttribute("nodeRatioX");
			field.nodeRatioY = +g.getAttribute("nodeRatioY");
			field.offsetX = +g.getAttribute("offsetX");
			field.offsetY = +g.getAttribute("offsetY");
			field.upX = +g.getAttribute("upX");
			field.upY = +g.getAttribute("upY");
		}
		
		labels.push(note);
	}
}

/**
 * Given a container DOMElement and a list of label data, compile the labels into DOMElements and place them into the container.
 * @protected
 * @static
 * @param {Object} attributes - na
 * @param {String} attributes.id - na
 * @param {List[Object]} attributes.labels - na
 * @param {DOMElement} container - na
 * @param {String} contentClass - na
 */
yWorks.createLabels = function(attributes, container, contentClass) {
	var labels = attributes.nodeLabels || [];
	contentClass = contentClass || "yWorks note entry";
	
	for(var i = 0, j = labels.length; i < j; i++) {
		var note = labels[i];
		var notediv = document.createElement("div"), style = null;
		notediv.id = attributes.id+"-label-"+i;
		if(note.content) {
			yWorks.splitOnNewLines(notediv, note.content, contentClass);
			notediv.className = "yWorks note content";
			style = notediv.style;
			style.left = note.x+"px";
			style.top = note.y+"px";
			style.width = note.width+"px";
			style.height = note.height+"px";
			style["fontColor"] = note.fontColor;
			style["fontFamily"] = note.fontFamily += ", Arial, serif";
			style["fontSize"] = note.fontSize+"px";
			style["color"] = note.fontColor;
			var fontStyle = note.fontStyle || "";
			if(fontStyle.search("[b|B]old") != -1)
				style.fontWeight = " bold";
			if(fontStyle.search("[i|I]talic") != -1)
				style.fontStyle += " italic";
			style.textAlign = note.textAlign;
			if(note.hasLineColor) {
				style.borderStyle = "solid";
				style.borderColor = note.lineColor;
			}
			if(note.hasBackgroundColor)
				style.backgroundColor = note.color1;
			if(note.rotationAngle != 0)
				style.transform = "rotate("+note.rotationAngle+"deg)";
			style.visibility = note.visible ? "inherit" : "hidden";
		}
		container.appendChild(notediv);
	}
}

/**
 * Convert yWorks graphml descriptor of the line's styling into a form SVG can use.
 * @protected
 * @static
 * @param {String} type - a description of the style of interval style to break up the line
 * @param {Number} stroke - the thickness of the line
 * @returns {String} a serialized pattern that can be accepted by the SVG property 'stroke-dasharray'
 */
yWorks.createSVGLinePattern = function(type, stroke) {
	stroke = Math.max(stroke, 1);
	var dList = null;
	if(!type || type == "none")
		return null;
	
	if(type != "line") { // The line is not solid and is composed of dots and/or dashes
		dList = "";
		var d = [3, 3];
		if(type == "dashed")
			d[0] = 10;
		else if(type == "dashed_dotted")
			d = [10, 3, 3, 3];
		var dList = "";
		for(var i = 0, j = d.length, k = (stroke - 1) * 2; i < j; i++) {
			if(i%2 == 1)
				d[i] += k;
			dList += d[i] +" ";
		}
	}
	return dList;
}

/**
 * Compose the SVG DOMElements for a linear gradient.
 * @protected
 * @static
 * @param {SVGElement} svg - a container in which to store the resultant pattern
 * @param {Object} attributes - information pertaining to the gradient
 * @param {String} attributes.id - DOM id of the gradient to be assigned
 * @param {Number} attributes.width - the width of the span, assuming the transition is horizontal (called the span)
 * @param {Number} attributes.height - the height of the span, assuming the transition is horizontal
 * @param {Number} attributes.x1 - the x-coordinate starting percentage of the whole span
 * @param {Number} attributes.y1 - the y-coordinate starting percentage of the whole span
 * @param {Number} attributes.x2 - the x-coordinate final percentage of the whole span
 * @param {Number} attributes.y2 - the y-coordinate final percentage of the whole span
 * @param {Array} attributes.stops - all of the transitions of the gradient over the course of 0% to 100% (<stop> nodes)
 * @param {Number} attributes.stops[i].offset - the decimal (0.0--1.0) where the current transition starts or ends
 * @param {String} attributes.stops[i].offset - the percentage (includes '%') where the current transition starts or ends
 * @param {String} attributes.stops[i].color - the color on which the transition starts or ends
 * @param {Number} attributes.stops[i].opacity - the opacity on which the transition color starts or ends
 * @param {String} attributes.color1 - optional; if there is no stop data; the starting color for this transition
 * @param {String} attributes.color2 - optional; if there is no stop data; the ending color for this transition
 * @returns {Object} o - an object being returned
 * @returns {Boolean} o.useGradient - true, if the gradient was created; false, otherwise; defaults to "false"
 * @returns {String} o.color - a string that can be placed into the "fill" attribute to display either a color or a gradient; defaults to "none"
 * @see https://github.com/tmpvar/jsdom/issues/620
 */
yWorks.setupLinearGradient = function(svg, attributes) {
	var svgns = "http://www.w3.org/2000/svg";
	
	attr = attributes || {}; // Try to collect information about the gradient from the attribute.
	var id = attr.id || (attr.elem ? attr.elem.id+"-gradient" : null);
	var w = attr.width;
	var h = attr.height;
	if(!id || (!w && !h)) {
		console.log("Tried to create a linear gradient but did not have a suitable data (no id, or missing width and height).");
		return {useGradient:false, color:"none"};
	}
	w = w || h;
	h = h || w;
	var x1 = "x1" in attr ? attr.x1 : 0;
	var x2 = "x2" in attr ? attr.x2 : 1; // Default to a perfect ltr gradient
	var y1 = "y1" in attr ? attr.y1 : 0;
	var y2 = "y2" in attr ? attr.y2 : 0;
	var stops = attr.stops || [];
	
	var stopsLength = stops.length;
	if(stopsLength < 2) { // Missing stop interval data; we can recover if we have at least two colors
		var ret;
		var color1 = attr.color1, hasColor1 = color1 && color1 != "none";
		var color2 = attr.color2, hasColor2 = color2 && color2 != "none";
		var opacity1 = 1;
		var opacity2 = 1;
		if(hasColor1) {
			ret = yWorks.colorAndOpacity(attr.color1);
			color1 = ret.color;
			opacity1 = ret.opacity;
		}
		if(hasColor2) {
			ret = yWorks.colorAndOpacity(attr.color2);
			color2 = ret.color;
			opacity2 = ret.opacity;
		}
		if(hasColor1 && hasColor2) {
			stops = [];
			stops[0] = {offset:0, color:color1, opacity:opacity1};
			stops[1] = {offset:1.0, color:color2, opacity:opacity2};
			stopsLength = 2;
		}
		else if(hasColor1) {
			if(opacity1 == 1)
				return {useGradient:false, color:color1, opacity:1};
			
			stops = [];
			stops[0] = {offset:0, color:color1, opacity:opacity1};
			stops[1] = {offset:1.0, color:color1, opacity:opacity1};
			stopsLength = 2;
		}
		else if(hasColor2) {
			if(opacity2 == 1)
				return {useGradient:false, color:color2, opacity:1};
			
			stops = [];
			stops[0] = {offset:0, color:color2, opacity:opacity2};
			stops[1] = {offset:1.0, color:color2, opacity:opacity2};
			stopsLength = 2;
		}
		else
			return {useGradient:false, color:"none", opacity:0};
	}
	else {
		stops.sort(
			function convertAndCompare(a, b) { // Sort stop gradient intervals by offset value; additionally, convert into decimals
				var aOff = parseFloat(a.offset);
				var bOff = parseFloat(b.offset);
				return aOff - bOff;
			}
		);
		if(stops[0].offset != 0) { // The first element will be a 0-offset
			var stop1 = stops[0];
			stops.unshift({offset:0.0, color:stop1.color, opacity:stop1.opacity});
			stopsLength++;
		}
		if(stops[stopsLength-1].offset != 100 || stops[stopsLength-1].offset != 1) { // The last element will be a 1-offset
			var stop1 = stops[stopsLength-1];
			stops.push({offset:1.0, color:stop1.color, opacity:stop1.opacity});
			stopsLength++;
		}
	}
	
	// Create the gradient of lines
	var gradient = document.createElementNS(svgns, "linearGradient");
	gradient.setAttributeNS(null, "id", id);
	gradient.setAttributeNS(null, "x1", x1);
	gradient.setAttributeNS(null, "y1", y1);
	gradient.setAttributeNS(null, "x2", x2);
	gradient.setAttributeNS(null, "y2", y2);
	gradient.setAttributeNS(null, "patternUnits", "userSpaceOnUse");
	
	// Perform transitioning calculates and transitioning
	for(var i = 0; i < stopsLength; i++) {
		var stop = stops[i];
		var stopNode = document.createElementNS(svgns, "stop");
		stopNode.setAttributeNS(null, "offset", stop.offset);
		var style = stopNode.style;
		style["stop-color"] = stop.color;
		style["stop-opacity"] = stop.opacity;
		gradient.appendChild(stopNode);
	}
	
	var repo = svg; // Get the svg linear gradient repository, or create the instance of the repository, or accept an alternate location for this element
	if(repo == null) {
		var svgs = document.getElementsByTagName("svg");
		for(var i = 0, j = svgs.length; i < j; i++) {
			if(svgs[i].id == "linearGradientRepo") {
				repo = svg[i].getElementsByTagName("def")[0];
				break;
			}
		}
		if(!repo) {
			repo = document.createElementNS(svgns, "svg");
			repo.setAttributeNS(null, "id", "linearGradientRepository");
			repo.setAttributeNS(null, "width", 0);
			repo.setAttributeNS(null, "height", 0);
			var body = document.getElementsByTagName("body")[0];
			body.appendChild(repo); // Put it after everything in the <body>.  (If you put it in the <head>, it will not be referential.)
			var defs = document.createElementNS(svgns, "defs");
			repo.appendChild(defs);
			repo = defs; // <svg><def>...</def></svg>
		}
	}
	else if(repo.tagName.toUpperCase() != "DEFS") {
		var defs = repo.getElementsByTagName("defs")[0]; // Known container; check for <defs>...</defs> element
		if(!defs) {
			defs = document.createElementNS(svgns, "defs");
			repo.appendChild(defs);
		}
		repo = defs;
	}
	repo.appendChild(gradient); // Make available in the repo
	
	var ret = {}; // Prepare return object
	ret.useGradient = true;
	ret.color = 'url(#'+id+')';
	ret.opacity = 1;
	return ret;
}

/**
 * Combine or separate color and opacity information
 * @protected
 * @static
 * @param {String} color - the color data, with or without alpha (opacity); if no color is given, it defaults to "none" and the rest of the function is skipped
 * @param {Float} opacity - the optional opacity of ther material in decimal; if this value is provided, it is combined with the color data
 * @returns {Object} o - na
 * @returns {String} o.color - the resulting color in '#RRGGBB[AA]' hexadecimal format
 * @returns {Float} o.opacity - the resulting opacity value
 */
yWorks.colorAndOpacity = function(color, opacity) {
	// TODO: accept color in other formats?
	var outColor = color || "none";
	var outOpacity = opacity || 1;
	if(color != "none") {
		if(!opacity) {
			if(color.length == 9) {
				outOpacity = parseInt("0x"+color.slice(7, 9))/255; // Convert to a number in the interval of 0-1
				outColor = color.slice(0, 7);
			}
		}
		else {
			if(outOpacity < 0)
				outOpacity = 0;
			else if(outOpacity > 1)
				outOpacity = 1;
			var ret = yWorks.colorAndOpacity(color); // Does this color already have an opacity channel?
			if(ret.opacity != 1) {
				outOpacity = Math.min(Math.abs(ret.opacity - outOpacity), 0);
				outOpacity = ret.color;
			}
			
			var hex = Number(outOpacity * 255).toString(16);
			if(hex.length == 1)
				hex = "0"+hex;
			outColor += hex;
		}
	}
	// TODO: should it default to any color and opacity being 0 (transparent)?
	return {color:outColor, opacity:outOpacity};
}

/**
 * Break apart a continuous string at the endline characters and insert the substrings into their own subelements of the main container.
 * This creates "newlines" from an XML situation which normally ignores standard newline notations.
 * @protected
 * @static
 * @param {DOMElement} elem - the container DOMElement
 * @param {String} textContent - the original text
 * @param {String} cssClass - an optional class to assign to each othe thr create elements for the substrings
 * @returns {Array[String]} aryContent - an Array of the created substrings (as text)
 */
yWorks.splitOnNewLines = function(elem, textContent, cssClass) {
	textContent += "\n";
	var i = 0, j = -1;
	var aryContent = [];
	while((j = textContent.indexOf("\n", i)) > 0) {
		var ary = textContent.slice(i, j);
		var lineEntry = document.createElement("div");
		lineEntry.className = cssClass;
		lineEntry.style.width = elem.style.width;
		if(ary.length == 0) {
			ary = "."; // Must have valid text
			lineEntry.style.visibility = "hidden"; // Element has font-appropriate height
			aryContent.push("");
		}
		else
			aryContent.push(ary);
		lineEntry.appendChild(document.createTextNode(ary));
		elem.appendChild(lineEntry);
		i = j+1;
		j = -1;
	}
	return aryContent;
}

/**
 * Makes the specified color darker or lighter by a percentage value that shifts it towards either black or white or a third color.
 * @protected
 * @static
 * @param {Number} p - the percentage for color blend
 * @param {String} from - the color to start as
 * @param {String} to - the color to blend to; it deaults to either black or white depending on the value of p
 * @returns {String} the resulting shifted color
 * @see http://stackoverflow.com/questions/5560248/programmatically-lighten-or-darken-a-hex-color-or-rgb-and-blend-colors
 */
yWorks.shadeBlendConvert = function(p, from, to) {
	if(typeof(p) != "number" || p < -1 || p > 1 || typeof(from) != "string" || (from[0] != 'r' && from[0] != '#') || (typeof(to) != "string" && typeof(to) != "undefined"))
		return null; // ErrorCheck
	
	var r = Math.round;
	var h = from.length > 9;
	h = typeof(to) == "string" ? (to.length > 9 ? true : (to == "c" ? !h : false)) : h;
	var b = p < 0;
	p = b ? p * -1 : p;
	to = to && to != "c" ? to : (b ? "#000000" : "#FFFFFF");
	var f = yWorks.sbcRip(from, null, r);
	var t = yWorks.sbcRip(to, null, r);
	
	if(!f || !t)
		return null; // ErrorCheck
	if(h)
		return "rgb("+
				r((t[0] - f[0]) * p + f[0]) +","+
				r((t[1] - f[1]) * p + f[1]) +","+
				r((t[2] - f[2]) * p + f[2]) +
				(f[3] < 0 && t[3] < 0 ? ")" : ","+ (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 10000) / 10000 : t[3] < 0 ? f[3] : t[3]) +")");
	else
		return "#"+ (
				0x100000000 + (f[3] > -1 && t[3] > -1 ? r(((t[3] - f[3]) * p + f[3]) * 255) : t[3] > -1 ? r(t[3] * 255): f[3] > -1 ? r(f[3] * 255) : 255) *
				0x1000000 + r((t[0] - f[0]) * p + f[0]) *
				0x10000 + r((t[1] - f[1]) * p + f[1]) *
				0x100 + r((t[2] - f[2]) * p + f[2])
			).toString(16).slice(f[3] > -1 || t[3] > -1 ? 1 : 3);
}

/**
 * Transform the data of a color into a format that makes it easier to parse the rgb[a] components
 * @private
 * @static
 * @param {String} d - The original color in either rgb(r, g, b, a) format or in #rrggbbaa format.
 * @param {Function} i - Function for transforming data from one type to another; defaults to parseInt
 * @param {Function} r - Function for rounding data; defaults to Math.round
 * @return {Array[String]} The color in indexed format
 */
yWorks.sbcRip = function(d, i, r) {
	if(!i)
		i = parseInt;
	if(!r)
		r = Math.round;
	
	var l = d.length;
	var RGB = new Object();
	if(l > 9) {
		d = d.split(",");
		if(d.length < 3 || d.length > 4)
			return null; //ErrorCheck
		RGB[0] = i(d[0].slice(4));
		RGB[1] = i(d[1]);
		RGB[2] = i(d[2]);
		RGB[3] = d[3] ? parseFloat(d[3]) : -1;
	}
	else{
		if(l == 8 || l ==6 || l < 4)
			return null; // ErrorCheck
		if(l < 6)
			d = "#"+ d[1] + d[1] + d[2] + d[2] + d[3] + d[3] + (l > 4 ? d[4] +""+ d[4] : ""); //3 digit
		d = i(d.slice(1), 16);
		RGB[0] = d>>16&255;
		RGB[1] = d>>8&255;
		RGB[2] = d&255;
		RGB[3] = l == 9 || l == 5 ? r(((d>>24&255) / 255) * 10000) / 10000 : -1;
	}
	return RGB;
}