/**
 * Create and populate the namespace.
 */
yWorks = new GraphmlNamespace("http://www.yworks.com/xml/graphml");
yWorks.setSpecificClass(null, this["UMLClassNode"]);
yWorks.setSpecificClass(null, this["UMLNoteNode"]);
yWorks.setSpecificClass(null, this["ShapeNode"]);
yWorks.setSpecificClass(null, this["GenericNode"]);
yWorks.setSpecificClass(null, this["SVGNode"]);
yWorks.setSpecificClass(null, this["PolyLineEdge"]);
yWorks.setSpecificClass(null, this["ProxyAutoBoundsNode"]);

/**
 * The entry point for setting up the nodes from their data.
 * The yWorks namespace is fleshed out enough that certain actions are necessary to properly compose the graph elements for displaying in HTML.
 * @override
 */
yWorks.setup = function(canvas, graph, xml, attributes) {
	var attr = attributes || {};
	if(!canvas || !graph)
		throw new Error("Completely unrecoverable situation!  Missing either the canvas or the graph at a crucial setup stage!");
	
	yWorks.setElementsInView(graph);
	yWorks.clipEdgeEndpointsToNodes(canvas, graph);
	yWorks.allocateSVGResources(graph, xml);
	canvas.zoom = yWorks.zoom; //assign
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
		var notes = data.notes || [];
		for(var i = 0, j = notes.length; i < j; i++) { // Certain nodes have notes with their own dimensions
			var nx = notes[i].x, ny = notes[i].y, nxw = nx + notes[i].width, nyh = ny + notes[i].height;
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
			// TODO: edges can also have notes; currently we don't account for them, though
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
	graphData.x = lowerx;
	graphData.y = lowery;
	graphData.width = (upperx - lowerx);
	graphData.height = (uppery - lowery);
	
	//TODO: in the future, we want all elements to be moved so that the left-most ones and top-most ones are at x=0 and y=0, respectively
 	var cwidth = canvas.getWidth();
	var correctx = 0;
	if(lowerx < 0 || upperx > cwidth)
		correctx = -lowerx;
	var cheight = canvas.getHeight();
	var correcty = 0;
	if(lowery < 0 || uppery > cheight)
		correcty = -lowery;
	yWorks.shiftElements(graph, correctx, correcty); // Shift everything within a positive buffer region for the purposes of scrolling
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
	
	var nodes = graph.getNodes(); // Nodes
	for(var id in nodes) {
		var data = nodes[id].getRepresentation();
		if(!data)
			continue;
		data.setBounds({x:dx, y:dy}, true);
		data = data.getAttributes();
		var notes = data.notes || [];
		for(var i = 0, j = notes.length; i < j; i++) {
			notes[i].x += dx;
			notes[i].y += dy;
		}
	}
	
	var edges = graph.getEdges(); // Edges
	for(var id in edges) {
		var data = edges[id].getRepresentation();
		if(!data)
			continue;
		data = data.getAttributes();
		var points = data.points;
		for(var i = 0, j = points.length; i < j; i++) {
			points[i].x += dx;
			points[i].y += dy;
		}
		
		// Move over clipped end coordinates, if they exist
		var endpoints = data.endpoints;
		if(endpoints) {
			endpoints.source.x += dx;
			endpoints.source.y += dy;
			endpoints.target.x += dx;
			endpoints.target.y += dy;
		}
	}
	
	// TODO: Hyperedges?
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
 * @param {XML} data - the original graphml data
 */
yWorks.allocateSVGResources = function(graph, xml) {
	var resourceGroup = xml.getElementsByTagName("y:Resources")[0]; // Find resources
	if(!resourceGroup)
		return;
	
	var resources = resourceGroup.getElementsByTagName("y:Resource");
	var nodes = graph.getNodes(); // SVG-type Node elements interleaved with other elements
	for(var id in nodes) {
		var node = nodes[id];
		if(node.getRepresentationName() == "SVGNode") {
			var rep = node.getRepresentation();
			var resNum = rep.getRefid();
			var resElem = resources[(+resNum)-1]; // They're numbered, one-indexed (remember: this is a NodeList, not an Array)
			if(resElem) {
				var content = resElem.firstChild && resElem.firstChild.nodeValue;
				if(content) {
					content = content.replace(/&lt;/g, "<").replace(/&gt;/g, ">"); // Switch out xml-safe encoding for normal symbol
					rep.setRef(content);
				}
			}
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
	var zoomFactor = canvas.getGraphData().zoom;
	var graphWidth = graph.getWidth(canvas);
	var graphHeight = graph.getHeight(canvas);
	
	var lineHorSpan = graphData.span * zoomFactor;
	var lineVerSpan = graphData.span * zoomFactor;
	var gridListHor = "", gridListVer = "";
	for(var j = graphWidth, i = j % lineHorSpan, k = graphHeight; i <= j; i += lineHorSpan) {
		gridListHor += " M "+(i)+" 0";
		gridListHor += " L "+(i)+" "+(k);
	}
	for(var j = graphHeight, i = j % lineVerSpan, k = graphWidth; i <= j; i += lineVerSpan) {
		gridListVer += " M 0 "+(i);
		gridListVer += " L "+(k)+" "+(i);
	}
	
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
 * Zoom the canvas and all the elements and the background depicted in it.
 * @param {Number} factor - a value that indicates the zoom level that is never equal to or less than zero
 */
yWorks.zoom = function(factor) {
	var canvas = this.canvas;
	var graph = this.getGraph();
	if(!canvas || !graph)
		return;
	
	// Evaluate canvas zoom factor
	factor = isNaN(+factor) ? 1 : (factor <= 0 ? 1 : factor);
	var data = this.getGraphData();
	var currentFactor = data.zoom;
	if(currentFactor == factor)
		return;
	data.zoom = factor;
	
	// Calculate scrollbar offsets
	// TODO: canvas.scrollLeft and canvas.scrollTop are invalid if scroll n goes from range 0 < n < 1 to range n > 1; stopping at 1 works.
	var halfScrollLenHori = this.getScrollBarHorizontalLength()/2;
	var halfScrollLenVert = this.getScrollBarVerticalLength()/2;
	var setScrollHori = 0, setScrollVert = 0
	if(currentFactor >= 1) {
		setScrollHori = ((canvas.scrollLeft + halfScrollLenHori) / currentFactor) * factor - halfScrollLenHori;
		setScrollVert = ((canvas.scrollTop + halfScrollLenVert) / currentFactor) * factor - halfScrollLenVert;
	}
	else {
		data.zoom = 1;
		setScrollHori = graph.getWidth(this)/2 * factor - halfScrollLenHori;
		setScrollVert = graph.getHeight(this)/2 * factor - halfScrollLenVert;
		data.zoom = factor;
	}
	
	// Apply transformation scalar
	var tdata = "scale("+factor+","+factor+")";
	var cstyle = this.getContentLayer().style;
	var bstyle = this.getBackgroundLayer().style;
	GraphmlCanvas.setTransform(tdata, cstyle);
	if(factor > 1) {
		cstyle["transform-origin"] = "0 0";
		GraphmlCanvas.setTransform(tdata, bstyle);
	}
	else {
		cstyle["transform-origin"] = null;
		GraphmlCanvas.setTransform("scale(1,1)", bstyle);
	}
	if(factor <= 1 || currentFactor < 1) { // Completely redraw the background layer, to avoid gaps on the edges caused by scaling below 1
		this.clearBackgroundLayer();
		graph.drawBackground(this);
	}
	// Apply scrollbar offsets
	canvas.scrollLeft = setScrollHori;
	canvas.scrollTop = setScrollVert;
}

/**
 * Extract basic data from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {Number} attributes.x - na
 * @param {Number} attributes.y - na
 * @param {Number} attributes.width - na
 * @param {Number} attributes.height - na
 * @param {String} attributes.bgColor - na
 * @param {String} attributes.color2 - na
 * @param {String} attributes.transparent - na
 * @param {String} attributes.borderColor - na
 * @param {String} attributes.borderStyle - na
 * @param {Number} attributes.borderWidth - na
 * @param {XML} xml - the original markup of this element
 */
yWorks.getCommonFields = function(attributes, xml) {
	var g;
	g = xml.getElementsByTagName("y:Geometry")[0];
	attributes.geometry = {};
	attributes.geometry.x = attributes.x = +g.getAttribute("x");
	attributes.geometry.y = attributes.y = +g.getAttribute("y");
	attributes.geometry.width = attributes.width = +g.getAttribute("width");
	attributes.geometry.height = attributes.height = +g.getAttribute("height");
	g = xml.getElementsByTagName("y:Fill")[0];
	attributes.fill = {};
	attributes.fill.hasColor = g.getAttribute("hasColor") == "true";
	attributes.fill.color = attributes.bgColor = g.getAttribute("color");
	attributes.fill.color2 = attributes.color2 = g.getAttribute("color2");
	attributes.fill.transparent = attributes.transparent = g.getAttribute("transparent") == "true";
	g = xml.getElementsByTagName("y:BorderStyle")[0];
	attributes.borderStyle1 = {};
	attributes.borderStyle1.hasColor = g.getAttribute("hasColor") == "true";
	attributes.borderStyle1.borderColor = attributes.borderColor = g.getAttribute("color") || "none";
	attributes.borderStyle1.borderStyle = attributes.borderStyle = g.getAttribute("type");
	attributes.borderStyle1.borderWidth = attributes.borderWidth = +g.getAttribute("width");
}

/**
 * Extract data related to visualization customization from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {XML} xml - the original markup of this element
 */
yWorks.getStyleProperties = function(attributes, xml) {
	var styles = attributes.styleProperties = {};
	var g = xml.getElementsByTagName("y:StyleProperties")[0];
	if(g) {
		g = g.getElementsByTagName("y:Property");
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
 * @param {Array[Object]} attributes.notes - na
 * @param {Number} i in attributes notes - index of the labels extracted from the XML/1998/namespace
 * @param {Object} attributes.notes[i] - the data that formats a single text label (hitherto, "obj")
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
	var notes = attributes.notes;
	if(!attributes.notes)
		notes = attributes.notes = [];
	
	var x = attributes.x;
	var y = attributes.y;
	var labels = xml.getElementsByTagName("y:NodeLabel");
	for(var i = 0, j = labels.length; i < j; i++) {
		var label = labels[i];
		var note = {};
		if(!label.firstChild || !label.firstChild.nodeValue)
			continue; // Empty note
		
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
		note.autoSizePolicy = label.getAttribute("autoSizePolicy");
		note.modelName = label.getAttribute("modelName");
		note.fontFamily = label.getAttribute("fontFamily");
		note.fontSize = +label.getAttribute("fontSize");
		note.fontStyle = label.getAttribute("fontStyle");
		note.fontColor = label.getAttribute("textColor");
		note.underlined = label.getAttribute("underlinedText") == "true";
		notes.push(note);
	}
}

/**
 * Given a container DOMElement and a list of label data, compile the labels into DOMElements and place them into the container.
 * @protected
 * @static
 * @param {Object} attributes - na
 * @param {String} attributes.id - na
 * @param {List[Object]} attributes.notes - na
 * @param {DOMElement} container - na
 * @param {String} contentClass - na
 */
yWorks.createLabels = function(attributes, container, contentClass) {
	var notes = attributes.notes || [];
	contentClass = contentClass || "yWorks note entry";
	
	for(var i = 0, j = notes.length; i < j; i++) {
		var note = notes[i];
		var notediv = document.createElement("div"), style = null;
		notediv.id = attributes.id+"-label-"+i;
		var content = yWorks.splitOnNewLines(notediv, note.content, contentClass);
		if(content.length) {
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
			if(note.hasbackgroundColor)
				style.backgroundColor = note.color1;
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
	
	var attr = attributes || {}; // Try to collect information about the gradient from the attribute.
	var id = attr.id || (attr.elem ? attr.elem.id+"_gradient" : null);
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
		var color1 = attr.color1;
		var color2 = attr.color2;
		var opacity1 = 1;
		var opacity2 = 1;
		if(color1 && color2) {
			var ret;
			ret = yWorks.colorAndOpacity(color1);
			color1 = ret.color;
			opacity1 = ret.opacity;
			ret = yWorks.colorAndOpacity(color2);
			color2 = ret.color;
			opacity2 = ret.opacity;
			
			stops = [];
			stops[0] = {offset:0, color:color1, opacity:opacity1};
			stops[1] = {offset:1.0, color:color2, opacity:opacity2};
			stopsLength = 2;
		}
		else if(color1 || color2) {
			color1 = color1 || color2;
			var ret = yWorks.colorAndOpacity(color1);
			color1 = ret.color;
			opacity1 = ret.opacity;
			return {useGradient:false, color:color1, opacity:opacity1};
		}
		else {
			return {useGradient:false, color:"none", opacity:0};
		}
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
	ret.color = "url(#"+id+")";
	ret.opacity = "1";
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

/**
 *
 */
yWorksRepresentation.prototype = new Representation();
yWorksRepresentation.prototype.constructor = yWorksRepresentation;
function yWorksRepresentation(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @override
 */
yWorksRepresentation.prototype.getBounds = function() {
	var attr = this.getAttributes();
	var g = attr.geometry || attr;
	var X = g.x || 0;
	var Y = g.y || 0;
	var W = g.width || 0;
	var H = g.height || 0;
	return { x:X, y:Y, width:W, height:H };
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @override
 */
yWorksRepresentation.prototype.setBounds = function(bounds, increment) {
 	bounds = bounds || {};
	var attr = this.data;
	if(increment) {
		if("x" in bounds)
			attr.x += bounds.x;
		if("y" in bounds)
			attr.y += bounds.y;
		if("width" in bounds)
			attr.width += bounds.width;
		if("height" in bounds)
			attr.height += bounds.height;
		attr.geometry.x = attr.x;
		attr.geometry.y = attr.y;
		attr.geometry.width = attr.width;
		attr.geometry.height = attr.height;
	}
	else {
		if("x" in bounds)
			attr.geometry.x = attr.x = bounds.x;
		if("y" in bounds)
			attr.geometry.y = attr.y = bounds.y;
		if("width" in bounds)
			attr.geometry.width = attr.width = bounds.width;
		if("height" in bounds)
			attr.geometry.height = attr.height = bounds.height;
	}
}


/**
 * The representation of a UML class block.
 * @override
 */
UMLClassNode.prototype = new yWorksRepresentation();
UMLClassNode.prototype.constructor = UMLClassNode;
function UMLClassNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
UMLClassNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	yWorks.getLabels(attributes, xml); // Only the first label is ever displayed and that is the class name
	
	var g;
	g = xml.getElementsByTagName("y:UML")[0];
	attributes.uml = {};
	attributes.uml.clipContent = attributes.clipContent = g.getAttribute("clipContent") == "true";
	attributes.uml.use3DEffect = attributes.use3DEffect = g.getAttribute("use3DEffect") == "true";
	attributes.uml.omitDetails = attributes.omitDetails = g.getAttribute("omitDetails") == "true";
	attributes.uml.stereotype = attributes.stereotype = g.getAttribute("stereotype");
	attributes.uml.constraint = attributes.constraint = g.getAttribute("constraint");
	
	g = xml.getElementsByTagName("y:AttributeLabel")[0].firstChild;
	attributes.uml.properties = attributes.properties = (g ? g.textContent : null);
	
	g = xml.getElementsByTagName("y:MethodLabel")[0].firstChild;
	attributes.uml.methods = attributes.methods = (g ? g.textContent : null);
	
	return attributes;
}

/**
 * Create an HTML component to represent this UML class block.
 * The UMLClassNode object is unique among emulated yWorks elements as it contains no SVG and relies solely on HTML and CSS.
 * @override
 */
UMLClassNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry;
	var fill = attr.fill;
	var borderStyle1 = attr.borderStyle1;
	var uml = attr.uml;
	
	var gwidth = geometry.width+"px";
	var omitDetails = uml.omitDetails;
	var properties = uml.properties;
	var methods = uml.methods;
	var fields = properties || methods;
	
	var borderColor = borderStyle1.borderColor;
	var borderLine = borderStyle1.borderStyle; // Attribute border-style needs better parsing for CSS
	if(uml.use3DEffect)
		borderLine = "outset";
	else if(borderLine == "dashed_dotted")
		borderLine = "dashed";
	else if(borderLine == "line")
		borderLine = "solid";
	var overflow = uml.clipContent ? "hidden" : "visible"; // Attribute overflow needs better parsing for CSS
	
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks uml";
	
	// uml frame
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = this.id+"-shape";
	contentNode.className = "yWorks uml frame";
	style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = gwidth;
	style.height = geometry.height+"px";
	style["background-color"] = fill.color;
	style["border-color"] = uml.use3DEffect ? fill.color : borderColor;
	style["border-style"] = borderLine;
	style["border-width"] = borderStyle1.borderWidth+"px";
	style.opacity = fill.transparent ? 0 : 1; // Note: transparency is the opposite of opacity
	style.overflow = overflow;
	containerNode.appendChild(contentNode);
	
	// uml stereotype
	var featureNode = document.createElement("div");
	featureNode.id = this.id+"-stereotype";
	featureNode.className = "yWorks uml stereotype";
	featureNode.width = gwidth;
	if(uml.stereotype)
		featureNode.appendChild(document.createTextNode("<<"+uml.stereotype+">>"));
	contentNode.appendChild(featureNode);
	
	// uml class name (borrows code from yWorks.createLabels)
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-name";
	featureNode.className = "yWorks uml name";
	var note = attr.notes[0] || {content:"Class", fontColor:"#000000", fontSize:10};
	var content = yWorks.splitOnNewLines(featureNode, note.content, "className");
	style = featureNode.style;
	style.width = gwidth;
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
	if(note.hasbackgroundColor)
		style.backgroundColor = note.color1;
	contentNode.appendChild(featureNode);
	
	// uml constraint
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-constraint";
	featureNode.className = "yWorks uml constraint";
	featureNode.width = gwidth;
	if(uml.constraint)
		featureNode.appendChild(document.createTextNode("{"+uml.constraint+"}"));
	contentNode.appendChild(featureNode);
	
	// uml fields divider
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-divider-properties";
	if(fields && !omitDetails) {
		featureNode.className = "yWorks uml divider";
		featureNode.width = gwidth;
		var style = featureNode.style;
		style["border-top-color"] = borderColor;
	}
	contentNode.appendChild(featureNode);
	
	//uml properties	
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-properties";
	featureNode.className = "yWorks uml properties";
	featureNode.width = gwidth;
	if(properties && !omitDetails) {
		yWorks.splitOnNewLines(featureNode, properties, "yWorks uml entry");
	}
	contentNode.appendChild(featureNode);
	
	// uml fields divider	
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-divider-methods";
	if(fields && !omitDetails) {
		featureNode.className = "yWorks uml divider";
		featureNode.width = gwidth;
		var style = featureNode.style;
		style["border-top-color"] = borderColor;
	}
	contentNode.appendChild(featureNode);
	
	// uml methods
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-methods";
	featureNode.className = "yWorks uml methods";
	featureNode.width = gwidth;
	if(methods && !omitDetails) {
		yWorks.splitOnNewLines(featureNode, methods, "yWorks uml entry");
	}
	contentNode.appendChild(featureNode);
	return containerNode;
}


/**
 * The representation of a UML note block.
 * (I do not believe this is a standard UML component.)
 * @override
 */
UMLNoteNode.prototype = new yWorksRepresentation();
UMLNoteNode.prototype.constructor = UMLNoteNode;
function UMLNoteNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
UMLNoteNode.prototype.readXML = function(xml) {
	var attributes = {};
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	yWorks.getLabels(attributes, xml);
	return attributes;
}

/**
 * Create an HTML component to represent this UML note block.
 * @override
 */
UMLNoteNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry;
	var fill = attr.fill;
	var borderStyle1 = attr.borderStyle1;
	
	var x = geometry.x;
	var y = geometry.y;
	var w = geometry.width;
	var h = geometry.height;
	
	var borderColor = borderStyle1.borderColor;
	var lineStyle = yWorks.createSVGLinePattern(borderStyle1.borderStyle, borderStyle1.borderWidth);
	
	// uml note frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks note";
	
	// uml note background
	var contentNode = document.createElement("div");
	contentNode.className = "yWorks note frame";
	contentNode.id = this.id+"-shape";
	style = contentNode.style;
	style.left = x+"px";
	style.top = y+"px";
	style.width = w+"px";
	style.height = h+"px";
	containerNode.appendChild(contentNode);
	
	var svgns = "http://www.w3.org/2000/svg";
	var svg = document.createElementNS(svgns, "svg"), style = null;
	svg.setAttributeNS(null, "width", w+1);
	svg.setAttributeNS(null, "height", h+1);
	style = svg.style;
	style.left = x+"px";
	style.top = y+"px";
	contentNode.appendChild(svg);
	
	var fold = (w < 20 || h < 20) ? Math.min(w, h) * 0.75 : 15;
	var path = document.createElementNS(svgns, "path"), d = ""; // Outline
	d = "";
	d += "M 0 0";
	d += " L 0 "+(h);
	d += " L "+(w)+" "+(h);
	d += " L "+(w)+" "+(fold);
	d += " L "+(w-fold)+" 0";
	d += " L 0 0 Z"
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", lineStyle);
	style = path.style;
	style.fill = fill.color;
	style.stroke = borderColor;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Folded corner
	d = "";
	d += "M "+(w-fold)+" 0";
	d += " L "+(w-fold)+" "+(fold);
	d += " L "+(w)+" "+(fold);
	d += " L "+(w-fold)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", lineStyle);
	style = path.style;
	style.fill = "white";
	style.stroke = borderColor;
	svg.appendChild(path);
	
	// uml note content
	yWorks.createLabels(attr, containerNode);
	return containerNode;
}


/**
 * The representation of a number of geometric shapes.
 * @override
 */
ShapeNode.prototype = new yWorksRepresentation();
ShapeNode.prototype.constructor = ShapeNode;
function ShapeNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
ShapeNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	yWorks.getLabels(attributes, xml);
	
	var g = xml.getElementsByTagName("y:Shape")[0];
	attributes.shape = g.getAttribute("type");
	
	return attributes;
}

/**
 * Create an HTML component to represent this shape.
 * @override
 */
ShapeNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry;
	
	// shape frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks shape";
	
	// shape form
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = this.id+"-shape";
	contentNode.className = "yWorks shape frame";
	style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = geometry.width+"px";
	style.height = geometry.height+"px";
	contentNode.appendChild( ShapeNode.switchShape(attr.shape, attr) );
	containerNode.appendChild(contentNode);
	
	//shape text
	yWorks.createLabels(attr, containerNode);
	return containerNode;
}

/**
 * Select the shape for the representation.
 * This hub function branches to the specific shape to be drawn in SVG.
 * @private
 * @static
 * @param {String} shape - the name of the shape to be drawn (explicit)
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
ShapeNode.switchShape = function(shape, attributes) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	if(!attributes)
		return svg;
	
	var geometry = attributes.geometry;
	svg.setAttributeNS(null, "width", geometry.width+1);
	svg.setAttributeNS(null, "height", geometry.height+1);
	
	switch(shape) {
		case "diamond":
			ShapeNode.diamondShape(svg, shape, attributes);
			break;
		case "octagon":
			ShapeNode.octagonShape(svg, shape, attributes);
			break;
		case "trapezoid":
		case "trapezoid2":
			ShapeNode.trapezoidShape(svg, shape, attributes);
			break;
		case "triangle":
			ShapeNode.triangleShape(svg, shape, attributes);
			break;
		case "hexagon":
			ShapeNode.hexagonShape(svg, shape, attributes);
			break;
		case "parallelogram":
			ShapeNode.parallelogramShape(svg, shape, attributes);
			break;
		case "ellipse":
			ShapeNode.ellipseShape(svg, shape, attributes);
			break;
		case "rectangle":
		case "rectangle3d":
		case "roundrectangle":
			ShapeNode.rectangleShape(svg, shape, attributes);
			break;
		default:
			console.log("No graphics for "+attributes.id+"; please construct proper "+shape+" element");
	}
	return svg;
}

/**
 * Draw a ellipse shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.ellipseShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	
	var ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
	ellipse.setAttributeNS(null, "rx", w2);
	ellipse.setAttributeNS(null, "ry", h2);
	ellipse.setAttributeNS(null, "cx", w2 + 0.5);
	ellipse.setAttributeNS(null, "cy", h2 + 0.5);
	var style = ellipse.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(ellipse);
}

/**
 * Draw a rectangular shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.rectangleShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var borderColor = borderStyle.borderColor;
	var borderWidth = borderStyle.borderWidth;
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	if(shape.indexOf("round") == 0) {
		var d = Math.min(w, h)
		var r = d < 10 ? d/2 : 5;
		rect.setAttributeNS(null, "rx", r);
		rect.setAttributeNS(null, "ry", r);
	}
	rect.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderWidth));
	style = rect.style;
	style.fill = fill.color;
	style.stroke = borderColor;
	style["stroke-width"] = borderWidth;
	
	svg.appendChild(rect);
	
	if(shape.search("3d") != -1) {
		var polyline = document.createElementNS(svgns, "polyline");
		var points = "";
		points += "0,"+h;
		points += " 0,1";
		points += " "+w+",1";
		polyline.setAttributeNS(null, "points", points);
		style = polyline.style;
		style.fill = "none";
		style["stroke-width"] = borderWidth;
		style.stroke = yWorks.shadeBlendConvert(0.5, borderColor, "#FFFFFF");
		svg.appendChild(polyline);
		
		polyline = document.createElementNS(svgns, "polyline");
		points = "";
		points += "0,"+h;
		points += " "+w+","+h;
		points += " "+w+",0";
		polyline.setAttributeNS(null, "points", points);
		style = polyline.style;
		style.fill = "none";
		style["stroke-width"] = borderWidth;
		style.stroke = yWorks.shadeBlendConvert(-0.5, borderColor, "#000000");
		svg.appendChild(polyline);
	}
}

/**
 * Draw a parallelogram shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.parallelogramShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var w10 = w/10;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w10)+" 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-w10)+" "+(h);
	d += " L 0 "+(h)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a hexagon shape for this element.
 * This hexagon is not a regular hexagon so the proportions are intentional.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.hexagonShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w10 = w/10;
	var h = geometry.height, h2 = h/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w10)+" 0";
	d += " L "+(w-w10)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w-w10)+" "+(h);
	d += " L "+(w10)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w10)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a triangle shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.triangleShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h);
	d += " L 0 "+(h);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a trapezoid shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.trapezoidShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w4 = w/4;
	var h = geometry.height;

	var width = attr.width;
	var height = attr.height;
	var fourthWidth = width/4;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(shape.search("2") == -1) {
		d += "M "+(w4)+" 0";
		d += " L "+(w - w4)+" 0";
		d += " L "+(w)+" "+height;
		d += " L 0 "+height;
		d += " L "+(w4)+" 0 Z";
	}
	else {
		d += "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w - w4)+" "+height;
		d += " L "+(w4)+" "+height;
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a octagon shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.octagonShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w3 = w/3, w23 = 2*w3;
	var h = geometry.height, h3 = h/3, h23 = 2*h3;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); // TODO: look at the octagon code in GenericNode
	var d = "";
	d += "M "+(w3)+" 0";
	d += " L "+(w23)+" 0";
	d += " L "+(w)+" "+(h3);
	d += " L "+(w)+" "+(h23);
	d += " L "+(w23)+" "+(h);
	d += " L "+(w3)+" "+(h);
	d += " L 0 "+(h23);
	d += " L 0 "+(h3);
	d += " L "+(w3)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a diamond shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.diamondShape = function(svg, shape, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w2)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	var style = path.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}


/**
 * The representation of a number of shapes.
 * Business process model (BPM*) objects are included, as are flowchart elements and designs that assist in establishing entity relationship.
 * Generic shapes encompass a variety of form and logic entities.
 * @override
 */
GenericNode.prototype = new yWorksRepresentation();
GenericNode.prototype.constructor = GenericNode;
function GenericNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
GenericNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	yWorks.getStyleProperties(attributes, xml);
	yWorks.getLabels(attributes, xml);
	
	var g = xml.getElementsByTagName("y:GenericNode")[0];
	attributes.configuration = g.getAttribute("configuration");
	
	return attributes;
}

/**
 * Create an HTML component to represent this generic node.
 * @override
 */
GenericNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry;
	
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks generic";
	
	// shape frame
	var contentNode = document.createElement("div");
	contentNode.id = attr.id+"-shape";
	contentNode.className = "yWorks generic frame";
	var style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = geometry.width+"px";
	style.height = geometry.height+"px";
	contentNode.appendChild( GenericNode.switchConfiguration(attr.configuration, attr) );
	containerNode.appendChild(contentNode);
	
	yWorks.createLabels(attr, containerNode);
	return containerNode;
}

/**
 * Select the configuration for the representation.
 * This hub function branches to the specific entity to be drawn in SVG.
 * It also branches to other hub functions, reflecting how complicated and varied the number of entities that fall under the banner of "GenericNode."
 * @private
 * @static
 * @param {String} configuration - the name of the configuration to be drawn
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
GenericNode.switchConfiguration = function(configuration, attributes) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	if(!attributes)
		return svg;
	
	
	var geometry = attributes.geometry;
	svg.setAttributeNS(null, "width", geometry.width+1);
	svg.setAttributeNS(null, "height", geometry.height+1);
	
	switch(configuration) {
		// Flowchart elements
		case "com.yworks.flowchart.cloud":
			GenericNode.createFlowChartCloud(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.terminator":
			GenericNode.createFlowChartTerminator(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.data":
			GenericNode.createFlowChartParallelogram(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.manualOperation":
			GenericNode.createFlowChartTrapazoid(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.offPageReference":
			GenericNode.createFlowChartPentagon(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.annotation":
			GenericNode.createFlowChartSpecialRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.manualInput":
			GenericNode.createFlowChartAngledTopRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.dataBase":
			GenericNode.createFlowChartCylinder(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.display":
			GenericNode.createFlowChartDisplay(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.decision":
			GenericNode.createFlowChartDiamond(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.document":
		case "com.yworks.flowchart.paperType":
			GenericNode.createFlowChartCurvedRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.delay":
		case "com.yworks.flowchart.directData":
		case "com.yworks.flowchart.storedData":
			GenericNode.createFlowChartCurvedSideRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.userMessage":
		case "com.yworks.flowchart.networkMessage":
		case "com.yworks.flowchart.preparation":
			GenericNode.createFlowChartShavedSideRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.loopLimit":
		case "com.yworks.flowchart.loopLimitEnd":
		case "com.yworks.flowchart.card":
			GenericNode.createFlowChartShavedCornerRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.process":
		case "com.yworks.flowchart.predefinedProcess":
		case "com.yworks.flowchart.internalStorage":
			GenericNode.createFlowChartRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.start1":
		case "com.yworks.flowchart.start2":
		case "com.yworks.flowchart.sequentialData":
		case "com.yworks.flowchart.onPageReference":
			GenericNode.createFlowChartCircle(svg, configuration, attributes);
			break;
		// Entity relationship elements
		case "com.yworks.entityRelationship.attribute":
			GenericNode.createEntityAttribute(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.small_entity":
			GenericNode.createEntitySmall(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.big_entity":
			GenericNode.createEntityBig(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.relationship":
			GenericNode.createEntityRelationship(svg, configuration, attributes);
			break;
		// Modern node elements
		case "BevelNode":
		case "BevelNodeWithShadow":
		case "BevelNode2":
		case "BevelNode3":
			GenericNode.createBevel(svg, configuration, attributes);
			break;
		case "ShinyPlateNode":
		case "ShinyPlateNodeWithShadow":
		case "ShinyPlateNode2":
		case "ShinyPlateNode3":
			GenericNode.createPlate(svg, configuration, attributes);
			break;
		// BPMN elements
		case "com.yworks.bpmn.Gateway":
		case "com.yworks.bpmn.Gateway.withShadow":
			GenericNode.createGateway(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Event":
		case "com.yworks.bpmn.Event.withShadow":
			GenericNode.createEvent(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Conversation":
		case "com.yworks.bpmn.Conversation.withShadow":
			GenericNode.createConversation(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Artifact":
		case "com.yworks.bpmn.Artifact.withShadow":
			GenericNode.switchArtifact(svg, configuration, attributes);
			break;
		default:
			console.log("No graphics for "+attributes.id+"; please construct proper "+configuration+" element");
	}
	return svg;
}

/**
 * Select the detailing for an artifact entity.
 * This hub function branches to the specific entity to be drawn in SVG.
 * @private
 * @static
 * @param {String} configuration - the name of the configuration to be drawn
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
GenericNode.switchArtifact = function(svg, configuration, attributes) {
	var type = attributes.styleProperties["com.yworks.bpmn.type"];
	switch(type) {
		case "ARTIFACT_TYPE_DATA_OBJECT":
			GenericNode.createArtifactDataObject(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_ANNOTATION":
			GenericNode.createFlowChartSpecialRectangle(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_REPLY_MESSAGE":
		case "ARTIFACT_TYPE_REQUEST_MESSAGE":
			GenericNode.createArtifactMessage(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_DATA_STORE":
			GenericNode.createDataStore(svg, type, attributes);
			break;
		default:
			console.log("Missing type graphics for "+attributes.id+"; please construct proper "+configuration+" element");
	}
}

/**
 * Select (and draw) the detailing for a gateway entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to gateway-type entities.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchGatewayDetails = function(svg, attr) {
	var type = attr.styleProperties["com.yworks.bpmn.type"];
	switch(type) {
		case "GATEWAY_TYPE_PLAIN": // Nothing
			break;
		case "GATEWAY_TYPE_INCLUSIVE":
			GenericNode.createGatewayInclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_PARALLEL_EVENT_BASED_EXCLUSIVE_START_PROCESS":
			GenericNode.createGatewayParallelExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_DATA_BASED_EXCLUSIVE":
			GenericNode.createGatewayDataExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE_START_PROCESS":
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE":
			GenericNode.createGatewayEventExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_PARALLEL":
		case "GATEWAY_TYPE_COMPLEX":
			GenericNode.prototype.createGatewayComplexParallel(svg, type, attr);
			break;
		default:
			console.log("No graphics for "+attr.id+" characteristic - '"+type+"'");
	}
}

/**
 * Select (and draw) the detailing for an event entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to event-type drawings.
 * Unlike an earlier hub function, this one implements SVG directly rather than pass responsibility onto another function.
 * It also serves the purpose of constructing both the exterior of the event and an interior emblem for the event.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchEventDetails = function(svg, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	
	var w = attr.width, w2 = w/2 + 1;
	var h = attr.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	var circle = null, d = "", style = null, dashed = null;
	var svgns = "http://www.w3.org/2000/svg";
	var borderColor = attr.borderColor;
	
	var type1 = attr.styleProperties["com.yworks.bpmn.characteristic"]; // Outline design
	switch(type1) {
		case "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_NON_INTERRUPTING": // Single outline, dashed
			dashed = yWorks.createSVGLinePattern("dashed", 1);
			// Fall through
		case "EVENT_CHARACTERISTIC_START": // Single outline, solid
		case "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_INTERRUPTING":
			circle = document.createElementNS(svgns, "path");
			d = "";
			d += "M 1 "+(h2);
			d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2+len2)+" "+(h2);
			d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2-len2)+" "+(h2);
			circle.setAttributeNS(null, "d", d);
			circle.setAttributeNS(null, "stroke-dasharray", dashed);
			style = circle.style;
			style.fill = "none"
			style.stroke = borderColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			break;
		
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING": // Double line, dashed
			dashed = yWorks.createSVGLinePattern("dashed", 1);
			// Fall through
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_CATCHING": // Double line, solid
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_INTERRUPTING":
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING":
			var len23 = len2-3;
			circle = document.createElementNS(svgns, "path");
			d = "";
			d += "M 1 "+(h2);
			d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2+len2)+" "+(h2);
			d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2-len2)+" "+(h2);
			circle.setAttributeNS(null, "d", d);
			circle.setAttributeNS(null, "stroke-dasharray", dashed);
			style = circle.style;
			style.fill = "none"
			style.stroke = borderColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			
			circle = document.createElementNS(svgns, "path");
			d = "";
			d += "M 3 "+(h2);
			d += " A "+(len23)+" "+(len23)+" 0 0 1 "+(w2+len23)+" "+(h2);
			d += " A "+(len23)+" "+(len23)+" 0 0 1 "+(w2-len23-1)+" "+(h2);
			circle.setAttributeNS(null, "d", d);
			circle.setAttributeNS(null, "stroke-dasharray", dashed);
			style = circle.style;
			style.fill = "none"
			style.stroke = borderColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			break;
		
		case "EVENT_CHARACTERISTIC_END": // Single line, solid, thick
			circle = document.createElementNS(svgns, "circle");
			circle.setAttributeNS(null, "cx", w2);
			circle.setAttributeNS(null, "cy", h2);
			circle.setAttributeNS(null, "r", len2-2);
			style = circle.style;
			style.fill = "none"
			style.stroke = borderColor;
			style["stroke-width"] = 3;
			svg.appendChild(circle);
			break;
		default:
			console.log("No graphics for "+this.id+" characteristic - '"+type1+"'");
	}
	
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var borderWidth = attr.borderWidth;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var detailColor = bdColor;
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:attr.width, height:attr.height, color1:color1, color2:color2}).color;
	if(type1 == "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING" || type1 == "EVENT_CHARACTERISTIC_END") {
		bgColor = "black";
		detailColor = "white";
	}
	var type2 = attr.styleProperties["com.yworks.bpmn.type"]; // Central emblem
	switch(type2) {
		case "EVENT_TYPE_PLAIN": // Nothing
			break;
		
		case "EVENT_TYPE_MESSAGE":
			var mw = w * 0.516;
			var mh = h * 0.35;				
			GenericNode.createArtifactMessage(svg, "", {x:(w - mw)/2 + 1, y:(h - mh)/2 + 1, width:mw, height:mh, bgColor:bgColor, borderColor:bdColor, borderWidth:borderWidth, detailColor:detailColor});
			break;
			
		case "EVENT_TYPE_TIMER":
			var face = len2 - 0.166*len;
			var line = null;
			var time = new Date(), hour = time.getHours(), hAngle = -90 + /*(hour > 11 ? hour - 12 : hour)*/hour * 30, mAngle = -90 + time.getMinutes() * 6;
			circle = document.createElementNS(svgns, "circle"); // Clock face
			circle.setAttributeNS(null, "cx", w2);
			circle.setAttributeNS(null, "cy", h2);
			circle.setAttributeNS(null, "r", face);
			style = circle.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			
			for(var angle = 0; angle < 360;  angle += 30) { //Details; hour markings
				line = document.createElementNS(svgns, "line");
				line.setAttributeNS(null, "x1", (w2 + 0.8*face));
				line.setAttributeNS(null, "x2", (w2 + face));
				line.setAttributeNS(null, "y1", h2);
				line.setAttributeNS(null, "y2", h2);
				line.setAttributeNS(null, "transform", "rotate("+angle+" "+w2+" "+h2+")");
				style = line.style;
				style.fill = "none";
				style.stroke = detailColor;
				style["stroke-width"] = 1;
				svg.appendChild(line);
			}
			
			line = document.createElementNS(svgns, "line"); // Details; hands - hour
			line.setAttributeNS(null, "x1", (w2));
			line.setAttributeNS(null, "x2", (w2 + 0.6*face));
			line.setAttributeNS(null, "y1", h2);
			line.setAttributeNS(null, "y2", h2);
			line.setAttributeNS(null, "transform", "rotate("+hAngle+" "+w2+" "+h2+")");
			style = line.style;
			style.fill = "none";
			style.stroke = detailColor;
			style["stroke-width"] = 0.5;
			svg.appendChild(line);
			line = document.createElementNS(svgns, "line"); // Details; hands - minute
			line.setAttributeNS(null, "x1", (w2));
			line.setAttributeNS(null, "x2", (w2 + 0.75*face));
			line.setAttributeNS(null, "y1", h2);
			line.setAttributeNS(null, "y2", h2);
			line.setAttributeNS(null, "transform", "rotate("+mAngle+" "+w2+" "+h2+")");
			style = line.style;
			style.fill = "none";
			style.stroke = detailColor;
			style["stroke-width"] = 0.5;
			svg.appendChild(line);
			break;
			
		case "EVENT_TYPE_TERMINATE":
			circle = document.createElementNS(svgns, "circle"); // circle face
			circle.setAttributeNS(null, "cx", w2);
			circle.setAttributeNS(null, "cy", h2);
			circle.setAttributeNS(null, "r", len2 - 0.166*len);
			style = circle.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			break;
		
		case "EVENT_TYPE_PARALLEL_MULTIPLE":
			var len0066 = 0.066*len, len0266 = 0.266*len;
			var rect = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2-len0066)+" "+(h2-len0266);
			d += " L "+(w2+len0066)+" "+(h2-len0266);
			d += " L "+(w2+len0066)+" "+(h2-len0066);
			d += " L "+(w2+len0266)+" "+(h2-len0066);
			d += " L "+(w2+len0266)+" "+(h2+len0066);
			d += " L "+(w2+len0066)+" "+(h2+len0066);
			d += " L "+(w2+len0066)+" "+(h2+len0266);
			d += " L "+(w2-len0066)+" "+(h2+len0266);
			d += " L "+(w2-len0066)+" "+(h2+len0066);
			d += " L "+(w2-len0266)+" "+(h2+len0066);
			d += " L "+(w2-len0266)+" "+(h2-len0066);
			d += " L "+(w2-len0066)+" "+(h2-len0066);
			d += " L "+(w2-len0066)+" "+(h2-len0266)+" Z";
			rect.setAttributeNS(null, "d", d);
			style = rect.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(rect);
			break;
			
		case "EVENT_TYPE_CANCEL":
			var len0033 = 0.033*len, len0266 = 0.266*len, len007 = Math.max(0.07*len-1, 1);
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2-len0266+len007)+" "+(h2-len0266);
			d += " L "+(w2)+" "+(h2-len007); // Top center
			d += " L "+(w2+len0266-len007)+" "+(h2-len0266);
			d += " L "+(w2+len0266)+" "+(h2-len0266+len007);
			d += " L "+(w2+len007)+" "+(h2); // Right center
			d += " L "+(w2+len0266)+" "+(h2+len0266-len007);
			d += " L "+(w2+len0266-len007)+" "+(h2+len0266);
			d += " L "+(w2)+" "+(h2+len007); // Bottom center
			d += " L "+(w2-len0266+len007)+" "+(h2+len0266);
			d += " L "+(w2-len0266)+" "+(h2+len0266-len007);
			d += " L "+(w2-len007)+" "+(h2); // Left center
			d += " L "+(w2-len0266)+" "+(h2-len0266+len007);
			d += " L "+(w2-len0266+len007)+" "+(h2-len0266)+" Z"; // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
			
		case "EVENT_TYPE_SIGNAL":
			var len0266 = 0.266*len, len005 = 0.05*len, len0256 = len0266 - 2*len005;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2)+" "+(h2-len0266-len005); // Top
			d += " L "+(w2+len0266)+" "+(h2+len0256); // Right
			d += " L "+(w2-len0266)+" "+(h2+len0256); // Left
			d += " L "+(w2)+" "+(h2-len0266-len005)+" Z"; // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
			
		case "EVENT_TYPE_COMPENSATION":
			var len0266 = 0.266*len, len005 = 0.05*len, len0183 = 0.183*len;
			var wmod = w2 - len005;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(wmod-len0266)+" "+(h2); // Left triangle
			d += " L "+(wmod)+" "+(h2-len0183);
			d += " L "+(wmod)+" "+(h2+len0183);
			d += " L "+(wmod-len0266)+" "+(h2)+" Z";
			d += "M "+(wmod)+" "+(h2); // Right triangle
			d += " L "+(wmod+len0266)+" "+(h2-len0183);
			d += " L "+(wmod+len0266)+" "+(h2+len0183);
			d += " L "+(wmod)+" "+(h2)+" Z";
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
			
		case "EVENT_TYPE_LINK":
			var len0266 = 0.266*len, len0033 = 0.033*len, len0079 = 0.079*len, len0183 = 0.183*len;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2-len0266+2*len0033)+" "+(h2-len0079);
			d += " L "+(w2+len0033)+" "+(h2-len0079);
			d += " L "+(w2+len0033)+" "+(h2-len0079-len0183);
			d += " L "+(w2+len0266-len0033)+" "+(h2); // Point
			d += " L "+(w2+len0033)+" "+(h2+len0079+len0183);
			d += " L "+(w2+len0033)+" "+(h2+len0079);
			d += " L "+(w2-len0266+2*len0033)+" "+(h2+len0079);
			d += " L "+(w2-len0266+2*len0033)+" "+(h2-len0079)+" Z"; // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
		
		case "EVENT_TYPE_ESCALATION":
		var len0266 = 0.266*len, len0033 = 0.033*len, len0079 = 0.079*len, len0183 = 0.183*len;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2)+" "+(h2-len0079);
			d += " L "+(w2-len0266+len0079)+" "+(h2+len0266-len0079);
			d += " L "+(w2)+" "+(h2-len0266);
			d += " L "+(w2+len0266-len0079)+" "+(h2+len0266-len0079);
			d += " L "+(w2)+" "+(h2-len0079)+" Z"; // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
		
		case "EVENT_TYPE_ERROR":
			var len0033 = 0.033*len, len0266 = 0.266*len, len007 = Math.max(0.07*len-1, 1), len5 = len/5, len10 = len5/2;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2-len0266)+" "+(h2+len0266); // Left corner
			d += " L "+(w2-len10)+" "+(h2-len0266+len007);
			d += " L "+(w2+len10)+" "+(h2+2*len0033);
			d += " L "+(w2+len0266)+" "+(h2-len0266); // Right corner
			d += " L "+(w2+len10)+" "+(h2+len0266-len007);
			d += " L "+(w2-len10)+" "+(h2-len0033);
			d += " L "+(w2-len0266)+" "+(h2+len0266)+" Z"; // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
		
		case "EVENT_TYPE_MULTIPLE":
			var len0033 = 0.033*len, len0283 = 0.283*len, len0266 = 0.266*len, len0183 = 0.183*len, len007 = Math.max(0.07*len-1, 1), len5 = len/5, len10 = len5/2;
			var len03 = 0.3*len, len025 = 0.25*len, len0083 = 0.083*len;
			var path = document.createElementNS(svgns, "path");
			d = "";
			d += "M "+(w2)+" "+(h2-len03); // Top
			d += " L "+(w2-len0283)+" "+(h2-len0083); // Left
			d += " L "+(w2-len0183)+" "+(h2+len025); // Bottom left
			d += " L "+(w2+len0183)+" "+(h2+len025); // Bottom right
			d += " L "+(w2+len0283)+" "+(h2-len0083); // Right
			d += " L "+(w2)+" "+(h2-len03); // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
		
		case "EVENT_TYPE_CONDITIONAL":
			var len0258 = 0.258*len, len0204 = 0.204*len, len0158 = 0.158*len;
			var len0208 = 0.208*len, len0183 = 0.183*len, len01 = 0.1*len, len0041 = 0.041*len;
			
			var path = document.createElementNS(svgns, "path"); // Page
			d = "";
			d += "M "+(w2+len0204)+" "+(h2-len0258); // Q1
			d += " L "+(w2-len0204)+" "+(h2-len0258); // Q2
			d += " L "+(w2-len0204)+" "+(h2+len0258); // Q3
			d += " L "+(w2+len0204)+" "+(h2+len0258); // Q4
			d += " L "+(w2+len0204)+" "+(h2-len0258); // Rejoin
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			
			var path = document.createElementNS(svgns, "path"); // Details
			d = "";
			d += "M "+(w2-len0158)+" "+(h2-len0208); // L1-Start
			d += " L "+(w2+len0158)+" "+(h2-len0208); // L1-End
			d += "M "+(w2-len0158)+" "+(h2-len01); // L2-Start
			d += " L "+(w2+len0158)+" "+(h2-len01); // L2-End
			d += "M "+(w2-len0158)+" "+(h2+len0041); // L3-Start
			d += " L "+(w2+len0158)+" "+(h2+len0041); // L3-End
			d += "M "+(w2-len0158)+" "+(h2+len0183); // L4-Start
			d += " L "+(w2+len0158)+" "+(h2+len0183); // L4-End
			path.setAttributeNS(null, "d", d);
			style = path.style;
			style.fill = "none";
			style.stroke = detailColor;
			style["stroke-width"] = 1;
			svg.appendChild(path);
			break;
		
		default:
			console.log("No graphics for "+this.id+" icon - '"+type2+"'");
	}
}

/**
 * Draw a circle flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCircle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var rx = Math.min(w2, h2);
	var ry = rx;
	if(configuration.search("start1") != -1) { // The start1 element is an ellipse; the rest are circles
		rx = w2;
		ry = h2;
	}
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	ellipse.setAttributeNS(null, "rx", rx); // It's a circle that is typically longer than it is wide
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", w + 0.5);
	ellipse.setAttributeNS(null, "cy", h + 0.5);
	ellipse.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	style = ellipse.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(ellipse);
	
	// The sequential data element has a tail
	if(configuration.search("sequentialData") != -1) {
		var x = w + 0.5
		var	y = 2*h + 0.5;
		var line = document.createElementNS(svgns, "line");
		line.setAttributeNS(null, "x1", x);
		line.setAttributeNS(null, "y1", y);
		line.setAttributeNS(null, "x2", x+rx);
		line.setAttributeNS(null, "y2", y);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
	}
}

/**
 * Draw a terminator flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartTerminator = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	if(w <= h) { // Due to constraints, we're making an ellipse
		var w2 = w/2;
		var h2 = h/2;
		
		var ellipse = document.createElementNS(svgns, "ellipse");
		ellipse.setAttributeNS(null, "rx", w2);
		ellipse.setAttributeNS(null, "ry", h2);
		ellipse.setAttributeNS(null, "cx", w2 + 0.5);
		ellipse.setAttributeNS(null, "cy", h2 + 0.5);
		ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
		var style = ellipse.style;
		style.fill = color;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		
		svg.appendChild(ellipse);
	}
	else { // The terminator is pill-shaped
		var exlen = Math.abs(w - h);
		var r = h/2;
		var n = 0.666 * h;
		
		var path = document.createElementNS(svgns, "path");
		var d = "";
		d += "M "+r+" 0";
		d += " L "+(r+exlen)+" 0";
		d += " c "+ n+" 0 "+ n+" "+ h+" 0 "+ h;
		d += " L "+(r)+" "+h;
		d += " c "+(-n)+" 0 "+(-n)+" "+(-h)+" 0 "+(-h) +" Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		var style = path.style;
		style.fill = color;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		
		svg.appendChild(path);
	}
}

/**
 * Draw a rectangle flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(rect);
	
	var predefinedProcess = configuration.search("predefinedProcess") != -1;
	if(predefinedProcess || configuration.search("internalStorage") != -1) {
		var n = 9;
		if(w < 18)
			n = w/2;
		if(!predefinedProcess && h < 18)
			n = h/2;
		
		var line = document.createElementNS(svgns, "line"); // Line common to both elements
		line.setAttributeNS(null, "x1", n);
		line.setAttributeNS(null, "y1", 0);
		line.setAttributeNS(null, "x2", n);
		line.setAttributeNS(null, "y2", h);
		line.setAttributeNS(null, "stroke-dasharray", dashed);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
		
		line = document.createElementNS(svgns, "line");
		if(predefinedProcess) { // Vertical line along other side
			var x = w - n;
			line.setAttributeNS(null, "x1", x);
			line.setAttributeNS(null, "y1", 0);
			line.setAttributeNS(null, "x2", x);
			line.setAttributeNS(null, "y2", h);
		}
		else { // Horizontal line along top
			if(h < 18)
				n = h/2;
			line.setAttributeNS(null, "x1", 0);
			line.setAttributeNS(null, "y1", n);
			line.setAttributeNS(null, "x2", w);
			line.setAttributeNS(null, "y2", n);
		}
		line.setAttributeNS(null, "stroke-dasharray", dashed);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
	}
}

/**
 * Draw a special rectangle flowchart entity, with special shaved corners, for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartShavedCornerRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var beginLoop = configuration.search("loopLimit") != -1;
	var n = 9;
	if(w < 18 || h < 18)
		n = Math.min(w, h)/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(beginLoop || configuration.search("card") != -1) {
		d = "M "+n+" 0";
		if(beginLoop) {
			d += " L "+(w-n)+" 0"; // The graphic for loopLimit has an opposing shaved corner
			d += " L "+(w)+" "+(n);
		}
		else
			d += " L "+(w)+" 0"; // The graphic for card has a normal corner
		d += " L "+(w)+" "+(h);
		d += " L 0 "+(h);
		d += " L 0 "+(n);
		d += " L "+(n)+" 0 Z";
	}
	else { // For loopLimitEnd (actually, an upside down loopLimit)
		d = "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w)+" "+(h-n);
		d += " L "+(w-n)+" "+(h);
		d += " L "+(n)+" "+(h);
		d += " L 0 "+(h-n);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with a shaved side for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartShavedSideRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var n = 9;
	var preparation = configuration.search("preparation") != -1;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(preparation || configuration.search("userMessage") != -1) {
		d = "M "+(w-n)+" 0";
		d += " L "+(w)+" "+(h2);
		d += " L "+(w-n)+" "+h;
		if(preparation) { // The graphic for preparation has opposing shaved sides
			d += " L "+(n)+" "+h;
			d += " L 0 "+(h2);
			d += " L "+(n)+" 0";
		}
		else { // The graphic for userMessage has a flat left side
			d += " L 0 "+(h);
			d += " L 0 0";
		}
		d += " L "+(w-n)+" 0 Z";
	}
	else { // For networkMessage
		d = "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w)+" "+h;
		d += " L 0 "+(h);
		d += " L "+(n)+" "+(h2);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with an angled top for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartAngledTopRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var n = 9;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 "+(n);
	d += " L "+(w)+" 0";
	d += " L "+(w)+" "+(h);
	d += " L 0 "+(h);
	d += " L 0 "+(n)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with a curved top (and bottom) for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCurvedRectangle = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var t = 4.5;
	var cx = w/4;
	var cx3 = 3*cx;
	if(w/h2 < 1)
		t += t * (Math.max(w/h2, 2) - 1);
	else if(w/h2 > 1)
		t *= Math.max(0.5*h2/w, 0.5);
	var cy = t*3;
	var th = h - t;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w)+" "+(th);
	d += " c "+(-cx)+" "+(-cy)+" "+(-cx3)+" "+(cy)+" "+(-w)+" 0";
	if(configuration.search("document") != -1) { // Documents are flat on top
		d += " L 0 0";
		d += " L "+(w)+" 0";
	}
	else { // Paper types have curves on top
		d += " L 0 "+(t);
		d += " c "+(cx)+" "+(cy)+" "+(cx3)+" "+(-cy)+" "+(w)+" 0";
	}
	d += " L "+(w)+" "+(th)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with curved sides for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCurvedSideRectangle = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height, h3 = h/3;
	var n = 4.5, n15 = 1.5 * n;
	var wn = w - n;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var d = "";
	d = "M "+(wn)+" 0";
	if(configuration.search("storedData") != -1) // Stored data curves inwards on the right side
		d += " c "+(-n15)+" "+(h3)+" "+(-n15)+" "+(2*h3)+" 0 "+(h);
	else // Direct-access data and delays curve outwards on the right side
		d += " c "+(n15)+" "+(h3)+" "+(n15)+" "+(2*h3)+" 0 "+(h);
	if(configuration.search("delay") != -1) { // Delays are flat on the left side
		d += " L 0 "+(h);
		d += " L 0 0";
	}
	else { // Direct-access data and stored data have opposing curves on the left side
		d += " L "+(n)+" "+(h);
		d += " c "+(-n15+1)+" "+(-h3)+" "+(-n15+1)+" "+(-2*h3)+" 0 "+(-h);
	}
	d += " L "+(wn)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(configuration.search("directData") != -1) { // A decorative curve like on the left side to simulate 3D (cylinder)
		path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		d = "";
		d += "M "+(wn)+" 0";
		d += " c "+(-n15)+" "+(h3)+" "+(-n15)+" "+(2*h3)+" 0 "+(h);
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a special rectangle flowchart entity with ??? for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartSpecialRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w9 = w/9;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	style.fill = color;
	style.stroke = "none";
	style["stroke-width"] = 0;
	svg.appendChild(rect);
	
	var polyline = document.createElementNS(svgns, "polyline");
	var points = (w9)+","+(h)+" 0,"+(h)+" 0,0 "+(w9)+",0";
	polyline.setAttributeNS(null, "points", points);
	polyline.setAttributeNS(null, "stroke-dasharray", dashed);
	style = polyline.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(polyline);
}

/**
 * Draw a display flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartDisplay = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w1 = w*0.5, w3 = 0.12*w, w2 = w - w1 - w3;
	var h = geometry.height, h2 = h/2, h3 = h/3;
	var rat = h/w;
	if(h < w) { // If h < w, w2 elongates while w1 and w3 get shorter	
		w2 += w3*rat + w1*rat;
		w1 *= (1 - rat);
		w3 *= (1 - rat);
	}
	var n = w3, n15 = 1.5*n;
	var w12 = w1/2, w14 = w1/4, w126 = w12/6;
	var cx1 = -(w12 + w14 + rat), cx2 = (w12 - w14 - rat);
	var cyw1 = -(w12 - w126), cyw2 = -(w12 + w126);
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w1)+" 0";
	d += " L "+(w1+w2)+" 0";
	d += " c "+(n15)+" "+(h3)+" "+(n15)+" "+(2*h3)+" 0 "+(h);
	d += " L "+(w1)+" "+(h);
	d += " c "+(cx1)+" "+(cyw1)+" "+(cx1)+" "+(cyw2)+" "+(-w1)+" "+(-h2);
	d += " c "+(cx2)+" "+(cyw1)+" "+(cx2)+" "+(cyw2)+" "+( w1)+" "+(-h2)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a cylinder flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCylinder = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w8 = w/8, w28 = 2*w8, w68 = 6*w8;
	var h = geometry.height, h6 = h/6;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null; // Main body of cylinder
	var d = "";
	d = "M 0 "+h6;
	d += " c "+(w28)+" "+(-h6)+" "+(w68)+" "+(-h6)+" "+w+" 0";
	d += " L "+w+" "+(5*h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	d += " L 0 "+h6+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Extra dimension-adding curve
	d = "";
	d += "M "+(w)+" "+(h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a diamond flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartDiamond = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w2)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a parallelogram flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartParallelogram = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var n = 9;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(n)+" 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-n)+" "+(h);
	d += " L 0 "+(h);
	d += " L "+(n)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a trapezoid flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartTrapazoid = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var n = 9;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-n)+" "+(h);
	d += " L "+(n)+" "+(h);
	d += " L 0 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a pentagon flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartPentagon = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w4 = w/4, w34 = 3*w4;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w4)+" 0";
	d += " L "+(w34)+" 0";
	d += " L "+(w34)+" "+(h2);
	d += " L "+(2*w4)+" "+(h);
	d += " L "+(w4)+" "+(h2);
	d += " L "+(w4)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a cloud flowchart entity for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCloud = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var w = geometry.width;
	var h = geometry.height;
	
	this.createFlowChartCircle(svg, "start1", attr); // Yes, this is a cloud.
	
	var svgns = "http://www.w3.org/2000/svg";
	var g = document.createElementNS(svgns, "g");
	g.setAttributeNS(null, "font-size", w/4);
	g.setAttributeNS(null, "font-family", "sans-serif");
	g.setAttributeNS(null, "fill", "#C0C0C0");
	g.setAttributeNS(null, "stroke", "none");
	g.setAttributeNS(null, "text-anchor", "middle");
	svg.appendChild(g);
	
	var textElem = document.createElementNS(svgns, "text");
	textElem.setAttributeNS(null, "x", w/2);
	textElem.setAttributeNS(null, "y", 2*h/3);
	g.appendChild(textElem);
	
	textElem.appendChild(document.createTextNode("CLOUD")); // See? Perfectly legit.
}

/**
 * Draw a business process model attribute entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityAttribute = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2, cx = w2 + 0.5;
	var h = geometry.height, h2 = h/2, cy = h2 + 0.5;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	ellipse.setAttributeNS(null, "rx", rx);
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", cx);
	ellipse.setAttributeNS(null, "cy", cy);
	ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = ellipse.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(ellipse);
	
	if(attr.styleProperties["doubleBorder"] && rx > 8 && ry > 8) {
		ellipse = document.createElementNS(svgns, "ellipse"), style = null;
		ellipse.setAttributeNS(null, "rx", rx - 3);
		ellipse.setAttributeNS(null, "ry", ry - 3);
		ellipse.setAttributeNS(null, "cx", cx);
		ellipse.setAttributeNS(null, "cy", cy);
		ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
		style = ellipse.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(ellipse);
	}
}

/**
 * Draw a business process model small entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntitySmall = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	if(attr.styleProperties["doubleBorder"] && w > 8 && h > 8) {
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "x", 3);
		rect.setAttributeNS(null, "y", 3);
		rect.setAttributeNS(null, "width", w - 6);
		rect.setAttributeNS(null, "height", h - 6);
		rect.setAttributeNS(null, "stroke-dasharray", dashed);
		style = rect.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(rect);
	}
}

/**
 * Draw a business process model big entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityBig = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var header = h > 23;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Body
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", 5); // These are always 5
	rect.setAttributeNS(null, "ry", 5);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	if(header)
		style.fill = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	else
		style.fill = fill.color2; // Just the header section (see below)
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	if(header) {
		var path = document.createElementNS(svgns, "path"); // Header, not used if element is too short
		var d = "";
		d += "M 2 0";
		d += " L "+(w-2)+" 0";
		d += " L "+(w)+" 2"; // The curve is too miniscule to matter?
		d += " L "+(w)+" 23";
		d += " L 0 23";
		d += " L 0 2";
		d += " L 2 0 Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = fill.color2;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model entity relationship for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityRelationship = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d = "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w2)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(attr.styleProperties["doubleBorder"] && w > 8 && h > 8) {
		path = document.createElementNS(svgns, "path");
		d = "";
		d = "M "+(w2)+" 4";
		d += " L "+(w-6)+" "+(h2);
		d += " L "+(w2)+" "+(h-4);
		d += " L 6 "+(h2);
		d += " L "+(w2)+" 4 Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model gateway for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createGateway = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h)/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); // Base
	var d = "";
	d += "M "+(w2)+" "+(h2-len);
	d += " L "+(w2+len)+" "+(h2);
	d += " L "+(w2)+" "+(h2+len);
	d += " L "+(w2-len)+" "+(h2);
	d += " L "+(w2)+" "+(h2-len)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	GenericNode.switchGatewayDetails(svg, attr);
}

/**
 * Draw a business process model event for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEvent = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h)/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // Base
	circle.setAttributeNS(null, "cx", w2 + 1);
	circle.setAttributeNS(null, "cy", h2 + 1);
	circle.setAttributeNS(null, "r", len);
	var style = circle.style;
	style.fill = color;
	style.stroke = "none";
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	GenericNode.switchEventDetails(svg, attr);
}

/**
 * Draw a business process model conversation for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createConversation = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2, w21 = w2 + 1;
	var h = geometry.height, h2 = h/2, h21 = h2 + 1;
	var len = Math.min(w, h), len2 = Math.min(w2, h2), len4 = len/4, lenh = 0.866 * len2; // cos30
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M "+(w21-len4)+" "+(h21-lenh);
	d += " L "+(w21+len4)+" "+(h21-lenh);
	d += " L "+(w21+len2)+" "+(h21);
	d += " L "+(w21+len4)+" "+(h21+lenh);
	d += " L "+(w21-len4)+" "+(h21+lenh);
	d += " L "+(w21-len2)+" "+(h21);
	d += " L "+(w21-len4)+" "+(h21-lenh)+" Z";
	path.setAttributeNS(null, "d", d);
	circle.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a business process model data object for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactDataObject = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2, w21 = w2 + 1;
	var h = geometry.height, h2 = h/2, h21 = h2 + 1;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var collection = attr.styleProperties["com.yworks.bpmn.marker1"];
	var markerParallelCollection = collection == "BPMN_MARKER_PARALLEL";
	var spec = attr.styleProperties["com.yworks.bpmn.dataObjectType"];
	var plainSpec = spec && spec.search(/(IN|OUT)PUT/i) != -1;
	if(plainSpec) { // Spec ..._PLAIN can scale forever
		w = Math.max(w, 32);
		h = Math.max(h, (markerParallelCollection ? 37 : 21));
	}
	else if(markerParallelCollection) {
		w = Math.max(w, 15);
		h = Math.max(h, 17.5);
	}
	var shrt = Math.min(w, h);
	var foldLen = shrt*0.5 - shrt*0.1; // TODO: what is this? and why is 'shrt*0.4' not acceptable?
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null, d = ""; // Outline
	d += "M 1 1";
	d += " L "+(w-foldLen)+" 1";
	d += " L "+(w)+" "+(foldLen);
	d += " L "+(w)+" "+(h);
	d += " L 1 "+(h);
	d += " L 1 1 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Folded-over corner
	d = "";
	d += "M "+(w-foldLen)+" 1";
	d += " L "+(w-foldLen)+" "+(foldLen);
	d += " L "+(w)+" "+(foldLen);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(plainSpec) { // Spec ..._PLAIN does not have an arrow
		var iconLineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
		
		path = document.createElementNS(svgns, "path");
		d = "";
		d += "M 5 9";
		d += " L 13 9";
		d += " L 13 6";
		d += " L 17 11";
		d += " L 13 16";
		d += " L 13 13";
		d += " L 5 13";
		d += " L 5 9 Z";
		path.setAttributeNS(null, "d", d);
		style = path.style;
		if(spec.search("INPUT") != -1) {
			var iconFill1 = attr.styleProperties["com.yworks.bpmn.icon.fill"];
			var iconFill2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
			style.fill = yWorks.setupLinearGradient(svg, {id:attr.id+"_icon_gradient", x2:1, y2:1, width:w, height:h, color1:iconFill1, color2:iconFill2}).color;
		}
		else
			style.fill = iconLineColor;
		style.stroke = iconLineColor;
		style["stroke-width"] = 1;
		svg.appendChild(path);
	}
	
	if(markerParallelCollection) { // These three bars mark the data object as a collection
		var barw = 4;
		var barh = 15.5;
		var barx = w/2 - 7.5
		var bary = h - 1 - barh;
		var rect = null;
		
		for(var i = 0; i < 3; i++, barx += 5.5) {
			rect = document.createElementNS(svgns, "rect");
			rect.setAttributeNS(null, "x", barx);
			rect.setAttributeNS(null, "y", bary);
			rect.setAttributeNS(null, "width", barw);
			rect.setAttributeNS(null, "height", barh);
			style = rect.style;
			style.fill = "black";
			style.stroke = "none";
			style["stroke-width"] = 0;
			svg.appendChild(rect);
		}
	}
}

/**
 * Draw a business process model message for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactMessage = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var x = attr.x || 1;
	var y = attr.y || 1;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Envelope outline
	rect.setAttributeNS(null, "x", x);
	rect.setAttributeNS(null, "y", y);
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	var color1 = fill.color;
	var color2 = fill.color2;
	if(type.search("REPLY") != -1) { // Tint the background color darker
		if(color1) {
			var ret = yWorks.colorAndOpacity(color1);
			color1 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
			color1 = yWorks.colorAndOpacity(color1, ret.opacity).color;
		}
		if(color2) {
			var ret = yWorks.colorAndOpacity(color2);
			color2 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
			color2 = yWorks.colorAndOpacity(color2, ret.opacity).color;
		}
	}
	style.fill = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:color1, color2:color2}).color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	var path = document.createElementNS(svgns, "path") // Envelope fold
	var d = "";
	d += "M "+(x)+" "+(y);
	d += " L "+(x+w2)+" "+(y+h2);
	d += " L "+(x+w)+" "+(y);
	path.setAttributeNS(null, "d", d);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = attr.detailColor || borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a business process model data store for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createDataStore = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2, h8 = h/8, h82 = h8/2, h78 = 7*h8;
	var y = h8;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M 1 "+(h8-1);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(w)+" "+(h8-1);
	d += " L "+(w)+" "+(h78);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(1)+" "+(h78);
	d += " L 1 "+(h8-1)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = ret.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Rim, and strip around upper rim
	d = "";
	for(var i = 0, j = 3; i < j; i++, y += h82) {
		d += "M 1 "+(y);
		d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(0)+" "+(w)+" "+(y);
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw the detailing for an inclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayInclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // Bold 'o'
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", (lenSpan - 0.056 * len/2));
	var style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 0.067 * len;
	svg.appendChild(circle);
}

/**
 * Draw the detailing for a parallel exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayParallelExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var plusInner = 0.044 * len2, plusOuter = 0.356 * len2;
	
	var svgns = "http://www.w3.org/2000/svg";
	var circle = document.createElementNS(svgns, "circle"), style = null; // Circle
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", lenSpan);
	style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	var path = document.createElementNS(svgns, "path"); // Hollow '+'
	var d = "";
	d += "M "+(w2-plusInner)+" "+(h2-plusOuter);
	d += " L "+(w2+plusInner)+" "+(h2-plusOuter);
	d += " L "+(w2+plusInner)+" "+(h2-plusInner); // Top-right corner
	d += " L "+(w2+plusOuter)+" "+(h2-plusInner);
	d += " L "+(w2+plusOuter)+" "+(h2+plusInner);
	d += " L "+(w2+plusInner)+" "+(h2+plusInner); // Lower-right corner
	d += " L "+(w2+plusInner)+" "+(h2+plusOuter);
	d += " L "+(w2-plusInner)+" "+(h2+plusOuter);
	d += " L "+(w2-plusInner)+" "+(h2+plusInner); // Lower-left corner
	d += " L "+(w2-plusOuter)+" "+(h2+plusInner);
	d += " L "+(w2-plusOuter)+" "+(h2-plusInner);
	d += " L "+(w2-plusInner)+" "+(h2-plusInner); // Top-left corner
	d += " L "+(w2-plusInner)+" "+(h2-plusOuter)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw the detailing for a data exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayDataExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2;
	var boldLineWidth = 0.056 * len, lenSpan = 24.75/45 * len2 - 0.5 * boldLineWidth, wLenSpan = 0.244 * len2;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); // Bold 'x'
	var d = "";
	d += "M "+(w2-wLenSpan)+" "+(h2-lenSpan);
	d += " L "+(w2+wLenSpan)+" "+(h2+lenSpan);
	d += "M "+(w2+wLenSpan)+" "+(h2-lenSpan);
	d += " L "+(w2-wLenSpan)+" "+(h2+lenSpan);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-linecap", "round");
	var style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = boldLineWidth;
	svg.appendChild(path);
}

/**
 * Draw the detailing for an event exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayEventExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	
	var svgns = "http://www.w3.org/2000/svg";
	var circle = document.createElementNS(svgns, "circle"); // Outer circle
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", lenSpan);
	style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	if(type == "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE") {
		circle = document.createElementNS(svgns, "circle"); // Inner circle
		circle.setAttributeNS(null, "cx", w2);
		circle.setAttributeNS(null, "cy", h2);
		circle.setAttributeNS(null, "r", (lenSpan - 0.056 * len));
		style = circle.style;
		style.fill = "none";
		style.stroke = bdColor;
		style["stroke-width"] = 1;
		svg.appendChild(circle);
	}
	
	var lenPenta = 0.156 * len;
	var xPentaA = Math.cos(0.314) * lenPenta, yPentaA = Math.sin(0.314) * lenPenta; // Angles are in radians
	var xPentaB = Math.sin(0.628) * lenPenta, yPentaB = Math.cos(0.628) * lenPenta; // Angles are in radians
	var path = document.createElementNS(svgns, "path");// Pentagon
	var d = "";
	d += "M "+(w2)+" "+(h2-lenPenta); // Top
	d += " L "+(w2-xPentaA)+" "+(h2-yPentaA); // Left
	d += " L "+(w2-xPentaB)+" "+(h2+yPentaB); // Lower left
	d += " L "+(w2+xPentaB)+" "+(h2+yPentaB); // Lower right
	d += " L "+(w2+xPentaA)+" "+(h2-yPentaA); // Right
	d += " L "+(w2)+" "+(h2-lenPenta)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw the detailing for a complex gateway entity or a parallel gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.prototype.createGatewayComplexParallel = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"); // Bold '+'
	var d = "";
	d += "M "+(w2)+" "+(h2-lenSpan);
	d += " L "+(w2)+" "+(h2+lenSpan); // Vertical
	d += "M "+(w2+lenSpan)+" "+(h2);
	d += " L "+(w2-lenSpan)+" "+(h2); // Horizontal
	if(type == "GATEWAY_TYPE_COMPLEX") {  // Bold 'x', completing an asterisk '*'
		var dLenSpan = lenSpan * Math.cos(0.785);
		d += "M "+(w2-dLenSpan)+" "+(h2-dLenSpan);
		d += " L "+(w2+dLenSpan)+" "+(h2+dLenSpan); // Diagonal up
		d += "M "+(w2+dLenSpan)+" "+(h2-dLenSpan);
		d += " L "+(w2-dLenSpan)+" "+(h2+dLenSpan); // Diagonal down
	}
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = boldLineWidth;
	svg.appendChild(path);
}

/**
 * Draw a plate shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createPlate = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width;
	var h = geometry.height;
	var c = 5; // orig 10, corner scaling is severe
	if("ModernNodeRadius" in attr.styleProperties)
		c = (attr.styleProperties["ModernNodeRadius"])/2;
	else if(configuration == "ShinyPlateNode" || configuration == "ShinyPlateNodeWithShadow")
		c = 1.5; // orig 3, corner scaling is severe
	var color = fill.color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Body
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	
	var shine = null; // Shine
	var x2 = 1;
	if(configuration == "ShinyPlateNode" || configuration == "ShinyPlateNodeWithShadow") {
		shine = document.createElementNS(svgns, "path");
		shine.setAttributeNS(null, "width", w);
		shine.setAttributeNS(null, "height", h);
		var d = "";
		d += "M 6 2";
		d += " L "+(2*w/3)+" 2";
		d += " c 0 0 0 0 0 4";
		d += " L 6 "+(4*h/5);
		d += " c 0 0 0 0 -4 0";
		d += " L 2 6";
		d += " c 0 0 0 0 4 -4 Z";
		shine.setAttributeNS(null, "d", d);
	}
	else {
		shine = document.createElementNS(svgns, "rect");
		shine.setAttributeNS(null, "width", (3*w/5 - 2));
		shine.setAttributeNS(null, "height", (2*h/3 - 2));
		shine.setAttributeNS(null, "rx", c);
		shine.setAttributeNS(null, "ry", c);
		shine.setAttributeNS(null, "transform", "translate(2,2)");
		x2 = 0.5;
	}
	style = shine.style;
	var color1 = yWorks.shadeBlendConvert(0.45, fill.color2 || color, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.65, color1, color);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"_gradient", width:w, height:h, x2:x2, y2:1,
			stops:[{offset:0.0, color:"#FFFFFF", opacity:1.0}, {offset:0.35, color:color1, opacity:1.0}, {offset:0.55, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = "none";
	style["stroke-width"] = 0;
	svg.appendChild(shine);
}

/**
 * Draw a beveled plate shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createBevel = function(svg, configuration, attr) {
	// TODO: scaling is probably wrong
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle1 || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2, h8 = h/8, h82 = h8/2, h78 = 7*h8;
	var c = 5; // orig 10, corner scaling is severe
	if("ModernNodeRadius" in attr.styleProperties)
		c = (attr.styleProperties["ModernNodeRadius"])/2;
	else if(configuration == "BevelNode" || configuration == "BevelNodeWithShadow")
		c = 1.5; // orig 3, corner scaling is severe
	var color = fill.color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Base
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Top
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h/2);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	var color1 = yWorks.shadeBlendConvert(0.75, fill.color2 || color, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.5, color1, color);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"_gradient", width:w, height:h, x2:0, y2:1,
			stops:[{offset:0.0, color:color1, opacity:1.0}, {offset:0.75, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Major outline
	rect.setAttributeNS(null, "x", 2);
	rect.setAttributeNS(null, "y", 2);
	rect.setAttributeNS(null, "width", (w - 4));
	rect.setAttributeNS(null, "height", (h - 4));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = "none";
	style.stroke = yWorks.shadeBlendConvert(0.15, fill.color2 || color, "#000000");
	style["stroke-width"] = 2; // TODO: not acceptable
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Outer outline
	rect.setAttributeNS(null, "x", 1);
	rect.setAttributeNS(null, "y", 1);
	rect.setAttributeNS(null, "width", (w - 2));
	rect.setAttributeNS(null, "height", (h - 2));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = "none";
	style.stroke = "white";
	style["stroke-width"] = 1;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Inner outline
	rect.setAttributeNS(null, "x", 3);
	rect.setAttributeNS(null, "y", 3);
	rect.setAttributeNS(null, "width", (w - 6));
	rect.setAttributeNS(null, "height", (h - 6));
	rect.setAttributeNS(null, "rx", Math.min(c - 2, c));
	rect.setAttributeNS(null, "ry", Math.min(c - 2, c));
	style = rect.style;
	style.fill = "none";
	style.stroke = "white";
	style["stroke-width"] = 1;
	svg.appendChild(rect);
}


/**
 * The representation of a special element with a visual component that is stored as SVG data.
 * They appears to comprise a group of computer-related visual elements, some heads, and a stick figure.
 * @override
 */
SVGNode.prototype = new yWorksRepresentation();
SVGNode.prototype.constructor = SVGNode;
function SVGNode(id, attributes) {
	this.refid = null;
	this.resource = null;
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Get the resource identifier.
 * @returns {String} the identifier corresponding to a resource entry from the original graphml data
 */
SVGNode.prototype.getRefid = function() {
	return this.data.refid;
}

/**
 * Set the resource identifier.
 * @param {String} id - the identifier that should correspond to a resource entry in the original graphml data
 * @returns {Boolean} always returns true
 */
SVGNode.prototype.setRefid = function(id) {
	this.data.refid = id;
	return true;
}

/**
 * Get the resource.
 * @returns {SVG} the corresponding resource entry from the original graphml data
 */
SVGNode.prototype.getRef = function() {
	return this.data.resource;
}

/**
 * Set the resource.
 * @param {SVG} res - the corresponding resource entry from the original graphml data
 * @returns {Boolean} always returns true
 */
SVGNode.prototype.setRef = function(res) {
	this.data.resource = res;
	return true;
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
SVGNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	
	var g = xml.getElementsByTagName("y:SVGModel")[0];
	attributes.svgBoundsPolicy = g.getAttribute("svgBoundsPolicy");
	
	g = g && g.getElementsByTagName("y:SVGContent")[0];
	attributes.refid = g && g.getAttribute("refid");
	attributes.resource = null;
	
	return attributes;
}

/**
 * Create an HTML component to represent this SVG element.
 * @override
 */
SVGNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry || attr;
	
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks svg";
	
	var contentNode = document.createElement("div");
	contentNode.className = "yWorks svg frame";
	var style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = geometry.width+"px";
	style.height = geometry.height+"px";
	
	contentNode.appendChild( SVGNode.reconstructSVGResourceData(attr) );
	containerNode.appendChild(contentNode);
	return containerNode;
}

/**
 * Re-parse the DOM structure associated with the particular resource of this SVGNode element to compose an image.
 * Rather than the exhaustive constructors of the GenericNode elements, SVGNodes have their SVG included at the end of the markup source source.
 * The setup routines for this namespace extract and pair the data with the element.
 * @param {Object} attr - an optional reference that would contain data important to the reconstruction of the svg element
 * @returns {SVGElement} an element that contains the svg element
 */
SVGNode.reconstructSVGResourceData = function(attr) {
	/*
	The basic svg-type data for this namespace's file type stored at the end of the main graphml file.
	It is filled with its own foreign namespace data, for example, inkscape and sodipodi.
	Fortunately, the DOMParser can transform most of the important data into a proper tree structure that can be explored.
	*/
	var geometry = attr.geometry || attr;
	var id = attr.id;
	var refid = attr.refid;
	var resource = attr.resource;
	var resourceDOM = null;
	
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); // Placeholder
	if(!resource) {
		console.log("Element "+id+": missing resource '"+refid+"'");
		return svg;
	}
	try {
		resourceDOM  = new DOMParser().parseFromString(resource, "text/xml");
	}
	catch(err) {
		console.log("Element "+id+": could not parse resource string '"+refid+"' into a DOM structure - "+err.message);
		return svg;
	}
	
	var header = resourceDOM.getElementsByTagName("svg")[0]; // Caution: SVGElements can contain valid SVGElements
	if(!header) {
		console.log("Element "+id+": can not find (root of) vector graph data in parsed DOM structure");
		return svg;
	}
	svg.setAttributeNS(null, "width", geometry.width);
	svg.setAttributeNS(null, "height", geometry.height);
	header.parentNode.removeChild(header);
	svg = header;
	SVGNode.propagateUniqueID(svg, id);
	return svg;
}

/**
 * Exhaustively iterate through the children of an scalable vector graphics element and append a unique identifier to specific attribute values.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG drawings
 * @param {String} uid - the label to append to the front of specific fields (the element's over-all identifier)
 */
SVGNode.propagateUniqueID = function(svg, uid) {
	/*
	SVG DOM elements can reference each other as long as they are defined in the same document, even if across unique SVG nodes.
	Some yWorks elements serialize into referencing elements, e.g. linearGradients, that utilize the same ids between different nodes.
	In the yWorks graph editor, the figures on the graph are unique; however, in an HTML document, they are SVG DOM elements.
	Cross-SVG referencing can cause graphical pollution because each re-definition is either ignored or treated as additional graphics on top of the existing ones.
	To solve this problem, each SVG element is provided with a UID that maintains distinction to a single SVG node.
	*/
	var mask = uid+"_";
	var children = svg.children;
	for(var i = 0, j = children.length; i < j; i++) {
		var child = children[i];
		if(child.id)
			child.id = mask + child.id;
		
		var style = child.style;
		if(style && style.fill.search(/url\(#/) == 0) {
			var sfill = style.fill;
			style.fill = "url(#"+mask + sfill.slice(5, sfill.length);
		}
		
		var fill = child.getAttributeNS(null, "fill");
		if(fill && fill.search(/url\(#/) == 0) {
			child.setAttributeNS(null, "fill", "url(#"+mask + fill.slice(5, fill.length));
		}
		
		if(child.children.length)
			SVGNode.propagateUniqueID(child, uid);
	}
}

/**
 * na
 */
ProxyAutoBoundsNode.prototype = new yWorksRepresentation();
ProxyAutoBoundsNode.prototype.constructor = ProxyAutoBoundsNode;
function ProxyAutoBoundsNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @override
 */
ProxyAutoBoundsNode.prototype.getBounds = function() {
	var attr = this.data;
	var group = attr.groups[attr.active];
	var obj = {};
	if(!group) { // TODO: unwarranted failsafe
		obj.x = 0;
		obj.y = 0;
		obj.width = 0;
		obj.height = 0;
	}
	else {
		obj.x = group.x;
		obj.y = group.y;
		obj.width = group.width;
		obj.height = group.height;
	}
	return obj;
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @override
 */
ProxyAutoBoundsNode.prototype.setBounds = function(bounds, increment) {
	var groups = this.data.groups;
	if(increment) {
		for(var i = 0, j = groups.length; i < j; i++) {
			var group = groups[i];
			if("x" in bounds)
				group.x += bounds.x;
			if("y" in bounds)
				group.y += bounds.y;
			if("width" in bounds)
				group.width += bounds.width;
			if("height" in bounds)
				group.height += bounds.height;
		}
	}
	else {
		for(var i = 0, j = groups.length; i < j; i++) {
			var group = groups[i];
			if("x" in bounds)
				group.x = bounds.x;
			if("y" in bounds)
				group.y = bounds.y;
			if("width" in bounds)
				group.width = bounds.width;
			if("height" in bounds)
				group.height = bounds.height;
		}
	}
}

/**
 * na
 */
ProxyAutoBoundsNode.prototype.readXML = function(xml) {
	var attributes = {};

	attributes.id = this.id;
	attributes["foldertype"] = xml.getAttribute("yfiles.foldertype");
	
	var g;
	g = xml.getElementsByTagName("y:Realizers")[0];
	attributes.active = +g.getAttribute("active");
	
	// GroupNodes
	var groups = attributes.groups = [];
	var gElems = g.getElementsByTagName("y:GroupNode");
	for(var i = 0, j = gElems.length; i < j; i++) {
		var group = {};
		var gi = gElems[i];
		yWorks.getCommonFields(group, gi);
		yWorks.getLabels(group, gi);
		
		var section = gi.getElementsByTagName("y:Shape")[0], field = null;
		group.shape = section.getAttribute("type");
		
		field = (group.state = {});
		section = gi.getElementsByTagName("y:State")[0];
		field.closed = section.getAttribute("closed") == "true";
		field.closedHeight = +section.getAttribute("closedHeight");
		field.closedWidth = +section.getAttribute("closedWidth");
		field.innerGraphDisplayEnabled = section.getAttribute("innerGraphDisplayEnabled") == "true";
		
		field = (group.insets = {});
		section = gi.getElementsByTagName("y:Insets")[0];
		field.left = +section.getAttribute("left");
		field.leftF = +section.getAttribute("leftF");
		field.right = +section.getAttribute("right");
		field.rightF = +section.getAttribute("rightF");
		field.top = section.getAttribute("top");
		field.topF = +section.getAttribute("topF");
		field.bottom = section.getAttribute("bottom");
		field.bottomF = +section.getAttribute("bottomF");
		
		field = (group.borderInsets = {});
		section = gi.getElementsByTagName("y:BorderInsets")[0];
		field.left = +section.getAttribute("left");
		field.leftF = +section.getAttribute("leftF");
		field.right = +section.getAttribute("right");
		field.rightF = +section.getAttribute("rightF");
		field.top = section.getAttribute("top");
		field.topF = +section.getAttribute("topF");
		field.bottom = section.getAttribute("bottom");
		field.bottomF = +section.getAttribute("bottomF");
		
		groups.push(group);
	}
	
	// GenericGroupNodes
	// ...
	
	return attributes;
}

/**
 * Create an HTML component to represent this edge.
 * @override
 */
ProxyAutoBoundsNode.prototype.createElement = function(attr) {
	attr = attr || this.data;
	
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks proxy";
	
	var contentNode = null, style = null;
	var groups = attr.groups;
	var active = attr.active;
	for(var i = 0, j = groups.length; i < j; i++) {
		var group = groups[i];
		contentNode = document.createElement("div"), style = null;
		contentNode.id = this.id+"-shape-"+i;
		contentNode.className = "yWorks proxy shape";
		style = contentNode.style;
		style.left = group.x+"px";
		style.top = group.y+"px";
		style.width = group.width+"px";
		style.height = group.height+"px";
		if(i != active)
			style.visibility = "hidden";
		contentNode.appendChild( ShapeNode.switchShape(group.shape, group) ); // One part of the proxy auto-bounds is a shape like ShapeNode
		containerNode.appendChild(contentNode);
	}
	
	return containerNode;
}


/**
 * The representation of an edge, or line segments that connect different nodes.
 * yWorks edges can have multiple corners and decorated endpoints.
 * They also have complex curves (not currently supported).
 * @override
 */
PolyLineEdge.prototype = new yWorksRepresentation();
PolyLineEdge.prototype.constructor = PolyLineEdge;
function PolyLineEdge(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
PolyLineEdge.prototype.readXML = function(xml) {
	var attributes = {};
	attributes.id = xml.getAttribute("id");
	attributes.src = xml.getAttribute("source"); // TODO: rename this later
	attributes.tgt = xml.getAttribute("target"); // TODO: rename this later
	
	var g = null, field = null;
	g = xml.getElementsByTagName("y:Path")[0];
	field = attributes.path = {};
	field.sx = +g.getAttribute("sx");
	field.sy = +g.getAttribute("sy");
	field.tx = +g.getAttribute("tx");
	field.ty = +g.getAttribute("ty");
	
	g = xml.getElementsByTagName("y:Point"); // We may have a number of intermediate points
	field = attributes.points = [];
	for(var i = 0, j = g.length; i < j; i++) {
		var point = g[i];
		field.push(
			{x:+point.getAttribute("x"),
			 y:+point.getAttribute("y")}
		);
	}
	
	g = xml.getElementsByTagName("y:LineStyle")[0];
	field = attributes.lineStyle = {};
	field.color = attributes.stroke = g.getAttribute("color");
	field.type = attributes.type = g.getAttribute("type");
	field.width = attributes.strokeWidth = g.getAttribute("width");
	
	g = xml.getElementsByTagName("y:Arrows")[0];
	field = attributes.arrows = {};
	field.source = g.getAttribute("source");
	field.target = g.getAttribute("target");
	
	g = xml.getElementsByTagName("y:BendStyle")[0];
	field = attributes.bendStyle = {};
	field.smoothed = g.getAttribute("smoothed") == "true";
	return attributes;
}

/**
 * Create an HTML component to represent this edge.
 * @override
 */
PolyLineEdge.prototype.createElement = function(attr) {
	attr = attr || this.data;
	if(!attr || !attr.src || !attr.tgt)
		throw new Error("An unknown edge was trying to be drawn.");
	
	var geometry = attr.geometry || attr;
	var lineStyle = attr.lineStyle;
	var stroke = lineStyle.color;
	var strokeWidth = lineStyle.width;
	var strokeStyle = lineStyle.type;
	var dash = yWorks.createSVGLinePattern(lineStyle.type, strokeWidth);
	
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks line"
	
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = attr.id+"-shape";
	contentNode.class = "yWorks line frame";
	style = contentNode.style;
//	style.left = geometry.x+"px";
//	style.top = geometry.y+"px";
	style.width = geometry.width+"px";
	style.height = geometry.height+"px";
	containerNode.appendChild(contentNode);
	
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttributeNS(null, "width", geometry.width + 13); // Add extra to make certain the line is properly enclosed
	svg.setAttributeNS(null, "height", geometry.height + 13);
	contentNode.appendChild(svg);
	
	style = {fill:"none", stroke:stroke};
	style["stroke-width"] = strokeWidth;
	PolyLineEdge.chainOfLines(svg, attr, style, dash);
	PolyLineEdge.arrowHead(svg, "source", attr);	
	PolyLineEdge.arrowHead(svg, "target", attr);
	
	return containerNode;
}

/**
 * Construct this edge out of a series of SVG lines.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {Object} dtyle - information pertinent to this edge's css
 * @param {String} dashed - the formatted string that explains how the line is stylized, if at all
 */
PolyLineEdge.chainOfLines = function(svg, attr, dstyle, dashed) {
	var points = attr.points;
	var endpoints = attr.endpoints;
	var x = endpoints.source.x, y = endpoints.source.y;
	var id = attr.id;
	
	var svgns = "http://www.w3.org/2000/svg";
	var line, style, i = 0;
	for(var j = points.length; i < j; i++) {
		var point = points[i];
		line = document.createElementNS(svgns, "line");
		line.id = id+"-segment-"+i;
		line.setAttributeNS(null, "x1", x);
		line.setAttributeNS(null, "y1", y);
		line.setAttributeNS(null, "x2", point.x);
		line.setAttributeNS(null, "y2", point.y);
		style = line.style;
		style.fill = dstyle.fill;
		style.stroke = dstyle.stroke;
		style["stroke-width"] = dstyle["stroke-width"];
		line.setAttributeNS(null, "stroke-dasharray", dashed);
		svg.appendChild(line);
		x = point.x;
		y = point.y;
	}
	line = document.createElementNS(svgns, "line");
	line.id = id+"-segment-"+i;
	line.setAttributeNS(null, "x1", x);
	line.setAttributeNS(null, "y1", y);
	line.setAttributeNS(null, "x2", endpoints.target.x);
	line.setAttributeNS(null, "y2", endpoints.target.y);
	style = line.style;
	style.fill = dstyle.fill;
	style.stroke = dstyle.stroke;
	style["stroke-width"] = dstyle["stroke-width"];
	line.setAttributeNS(null, "stroke-dasharray", dashed);
	svg.appendChild(line);
}

/**
 * Construct and orient any potential stylized endpoints for this edge.
 * All endpoints are drawn facing rightwards and then must be rotated around the tip to align with the line segment to which they coincide.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} side - either "source" or "target," indicating one end of the edge or the other
 * @param {Object} attributes - information pertinent to the entirety of the edge
 */
PolyLineEdge.arrowHead = function(svg, side, attributes) {
	// Which side?
	var points = attributes.points;
	var sideAttr = attributes.endpoints[side];
	var angleX = sideAttr.x;
	var angleY = sideAttr.y;
	if(side == "source") {
		var point = points[0];
		if(point) {
			angleX -= point.x;
			angleY -= point.y;
		}
		else {
			angleX -= attributes.endpoints.target.x;
			angleY -= attributes.endpoints.target.y;
		}
	}
	else if(side == "target") {
		var point = attributes.points[attributes.points.length-1];
		if(point) {
			angleX -= point.x;
			angleY -= point.y;
		}
		else {
			angleX -= attributes.endpoints.source.x;
			angleY -= attributes.endpoints.source.y;
		}
	}
	else // Error checking, in case side data was passed incorrectly
		return;
	
	var arrowType = attributes.arrows[side];
	if(arrowType == "none")
		return;
	
	// Calculate the rotation transform
	var left = sideAttr.x;
	var top = sideAttr.y;
	var angle = 0;
	if(angleY == 0)
		angle = angleX > 0 ? 0 : 180;
	else if(angleX == 0)
		angle = angleY > 0 ? 90 : -90;
	else {
		angle = Math.atan(angleY/angleX) * (180 / Math.PI);
		if(angleX < 0)
			angle += 180;
	}
	
	
//	if(side == "source") {
//		angleX = sideAttr.x - (px[0] || attributes.target.x);
//		angleY = sideAttr.y - (py[0] || attributes.target.y);
//	}
//	else if(side == "target") {
//		var len1 = px.length-1;
//		angleX = sideAttr.x - (px[len1] || attributes.source.x);
//		angleY = sideAttr.y - (py[len1] || attributes.source.y);
//	}
//	else
//		return;
//	arrowType = sideAttr.arrow || arrowType; // What the arrow type
//	if(arrowType == "none")
//		return;
	// Calculate the rotation transform
//	if(angleY == 0)
//		angle = angleX > 0 ? 0 : 180;
//	else if(angleX == 0)
//		angle = angleY > 0 ? 90 : -90;
//	else {
//		angle = Math.atan(angleY/angleX) * (180 / Math.PI);
//		if(angleX < 0)
//			angle += 180;
//	}
	
	var svgid = attributes.id+"-"+side+"-arrow";
	var attr = {};
	attr.stroke = attributes.stroke;
	attr.arrowType = arrowType;
	attr.transform = "rotate("+angle+" "+left+" "+top+")";
	switch(arrowType) {
		case "delta":
		case "white_delta":
			PolyLineEdge.deltaArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "diamond":
		case "white_diamond":
			PolyLineEdge.diamondArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "circle":
		case "transparent_circle":
			PolyLineEdge.circleArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "concave":
		case "convex":
			PolyLineEdge.curveArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "dash":
		case "skewed_dash":
		case "t_shape":
			PolyLineEdge.lineArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "standard":
		case "short":
			PolyLineEdge.standardArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "plain":
			PolyLineEdge.plainArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "crows_foot_one_mandatory":
			PolyLineEdge.mandatoryArrowHead(svg, svgid+"-A", left, top, attr);
			PolyLineEdge.oneArrowHead(svg, svgid+"-B", left, top, attr);
			break;
		case "crows_foot_many_mandatory":
			PolyLineEdge.mandatoryArrowHead(svg, svgid+"-A", left, top, attr);
			PolyLineEdge.manyArrowHead(svg, svgid+"-B", left, top, attr);
			break;
		case "crows_foot_one":
			PolyLineEdge.oneArrowHead(svg, svgid+"-A", left-7, top, attr);
			break;
		case "crows_foot_many":
			PolyLineEdge.manyArrowHead(svg, svgid+"-A", left, top, attr);
			break;
		case "crows_foot_one_optional":
			PolyLineEdge.optionalArrowHead(svg, svgid+"-A", left, top, attr);
			PolyLineEdge.oneArrowHead(svg, svgid+"-B", left, top, attr);
			break;
		case "crows_foot_many_optional":
			PolyLineEdge.optionalArrowHead(svg, svgid+"-A", left, top, attr);
			PolyLineEdge.manyArrowHead(svg, svgid+"-B", left, top, attr);
			break;
		case "crows_foot_optional":
			PolyLineEdge.optionalArrowHead(svg, svgid+"-A", left, top, attr);
			break;
	}
}

/**
 * Draws an endpoint designed like a delta symbol.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.deltaArrowHead = function(svg, id, left, top, attr) {
	left -= 15;
	top -= 5;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d = "M "+(left)+" "+(top);
	d += " L "+(left+15)+" "+(top+5);
	d += " L "+(left)+" "+(top+10);
	d += " L "+(left)+" "+(top)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = attr.arrowType == "delta" ? attr.stroke : "white";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint designed like a diamond.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.diamondArrowHead = function(svg, id, left, top, attr) {
	left -= 13;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d = "M "+(left)+" "+(top);
	d += " L "+(left+6)+" "+(top-4);
	d += " L "+(left+13)+" "+(top);
	d += " L "+(left+6)+" "+(top+4);
	d += " L "+(left)+" "+(top)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = attr.arrowType == "diamond" ? attr.stroke : "white";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint designed like a circle.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.circleArrowHead = function(svg, id, left, top, attr) {
	left -= 2;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	circle.id = id;
	circle.setAttributeNS(null, "cx", left);
	circle.setAttributeNS(null, "cy", top);
	circle.setAttributeNS(null, "r", 4);
	circle.setAttributeNS(null, "transform", attr.transform);
	var style = circle.style;
	style["stroke-width"] = 1;
	style.fill = attr.arrowType == "circle" ? attr.stroke : "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(circle);
}

/**
 * Draws an endpoint that includes a curved line.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.curveArrowHead = function(svg, id, left, top, attr) {
	left -= 12;
	top -= 6;
	var flex = attr.arrowType == "concave" ? [2,4,4,8] : [4,-2,8,12];
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d = "M "+(left)+" "+(top);
	d += " Q "+(left+flex[0])+" "+(top+flex[1])+" "+(left+12)+" "+(top+6);
	d += " M "+(left)+" "+(top+12);
	d += " Q "+(left+flex[2])+" "+(top+flex[3])+" "+(left+12)+" "+(top+6);
	if(attr.arrowType == "concave") {
		d += " M "+(left+11)+" "+top;
		d += " L "+(left+11)+" "+(top+12);
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint that includes a skewed line.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.lineArrowHead = function(svg, id, left, top, attr) {
	left -= attr.arrowType.search("dash") > -1 ? 13 : 3;
	top -= 7;
	var vary = attr.arrowType == "skewed_dash" ? 3 : 0;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d += "M "+(left-vary)+" "+(top);
	d += " L "+(left+vary)+" "+(top+14);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint designed like a typical arrow, but with a notched back.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.standardArrowHead = function(svg, id, left, top, attr) {
	var horOffset = attr.arrowType == "short" ? 7 : 11;
	left -= horOffset;
	top -= 5;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d += "M "+(left)+" "+(top);
	d += " L "+(left+horOffset)+" "+(top+5);
	d += " L "+(left)+" "+(top+10);
	d += " L "+(left+4)+" "+(top+5);
	d += " L "+(left)+" "+(top);
	d += " Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = attr.stroke;
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}
 
/**
 * Draws an endpoint designed like a typical arrow.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.plainArrowHead = function(svg, id, left, top, attr) {
	left -= 13;
	top -= 5;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d += "M "+(left)+" "+(top);
	d += " L "+(left+13)+" "+(top+5);
	d += " L "+(left)+" "+(top+10);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint that signifies a unary numerical relationship.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.oneArrowHead = function(svg, id, left, top, attr) {
	left -= 7;
	top -= 8;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d += "M "+(left)+" "+(top);
	d += " L "+(left)+" "+(top+16);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint that signifies an unbound numerical relationship.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.manyArrowHead = function(svg, id, left, top, attr) {
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var d = "";
	d += "M "+(left-9)+" "+(top);
	d += " L "+(left)+" "+(top-8);
	d += " M "+(left-9)+" "+(top);
	d += " L "+(left)+" "+(top+8);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}

/**
 * Draws an endpoint that signifies a potential relationship.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.optionalArrowHead = function(svg, id, left, top, attr) {
	left -= 15;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	path.id = id;
	path.setAttributeNS(null, "cx", left);
	path.setAttributeNS(null, "cy", top);
	path.setAttributeNS(null, "r", 5);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "white";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}
 
/**
 * Draws an endpoint that signifies a required relationship.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} id - the unique name for this drawing
 * @param {Number} left - the left-most coordinate of the contained drawing
 * @param {Number} top - the top-most coordinate of the contained drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {String} attr.stroke - the color of the endpoint
 * @param {String} attr.arrowType - the specific type of endpoint being drawn (multiple may be pooled by common strokes)
 * @param {String} attr.transform - as SVG rotation transformation to apply to the drawing
 */
PolyLineEdge.mandatoryArrowHead = function(svg, id, left, top, attr) {
	left -= 14;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	path.id = id;
	var d = "";
	d += "M "+(left)+" "+(top-8);
	d += " L "+(left)+" "+(top+8);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "transform", attr.transform);
	var style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}