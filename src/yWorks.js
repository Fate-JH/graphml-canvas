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

/**
 * The entry point for setting up the nodes from their data.
 * The yWorks namespace is fleshed out enough that certain actions are necessary to properly compose the graph elements for displaying in HTML.
 * @override
 */
yWorks.setup = function(canvas, graph, xml, attributes) {
	var attr = attributes || {};
	if(!canvas || !graph)
		throw new Error("Completely unrecoverable situation!  Missing either the canvas or the graph at a crucial setup stage!");
	
	yWorks.resolveGraphSize(graph);
	yWorks.prepareElementsForInitialDraw(canvas, graph);
	yWorks.allocateSVGResources(graph, xml);
	canvas.zoom = yWorks.zoom; //assign
}

/**
 * Ensure that all elements on the graph are positioned within bounds.
 * @private
 * @static
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 */
yWorks.resolveGraphSize = function(graph) {
	var nodes = graph.getNodes();
	var edges = graph.getEdges();
	var lowerx = Infinity, lowery = Infinity, upperx = -Infinity, uppery = -Infinity;
	
	for(var id in nodes) { // Iterate over nodes and determine if any are positioned off page to the left or top
		var data = nodes[id].getAttributes();
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
		var data = edges[id].getAttributes();
		var px = data.px, py = data.py;
		for(var i = 0, j = px.length; i < j; i++) {
			if(px[i] < lowerx)
				lowerx = px[i];
			else if(px[i] > upperx)
				upperx = px[i];
			if(py[i] < lowery)
				lowery = py[i];
			else if(py[i] > uppery)
				uppery = py[i];
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
	
	//TODO: why do we know about the custom canvas padding length?
 	var cwidth = canvas.getWidth();
	var correctx = 0;
	if(lowerx < 0 || upperx > cwidth)
		correctx = -lowerx + 50; // Note: in terms of content, the left side of the graph will be pushed to left=50
	var cheight = canvas.getHeight();
	var correcty = 0;
	if(lowery < 0 || uppery > cheight)
		correcty = -lowery + 50;
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
	// Shift all the elements by x, y units
	// Nodes
	var nodes = graph.getNodes();
	for(var id in nodes) {
		var data = nodes[id].getAttributes();
		data.x += dx;
		data.y += dy;
		var notes = data.notes || [];
		for(var i = 0, j = notes.length; i < j; i++) {
			notes[i].x += dx;
			notes[i].y += dy;
		}
	}
	// Edges
	var edges = graph.getEdges();
	for(var id in edges) {
		var data = edges[id].getAttributes();
		var px = data.px, py = data.py;
		for(var i = 0, j = px.length; i < j; i++) {
			px[i] += dx;
			py[i] += dy;
		}
		// Move over clipped end coordinates, if they exist
		var source = data.source;
		if("x" in source) {
			source.x += dx;
			source.y += dy;
		}
		var target = data.target;
		if("x" in target) {
			target.x += dx;
			target.y += dy;
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
yWorks.prepareElementsForInitialDraw = function(canvas, graph) {
	var nodes = graph.getNodes();
	var edges = graph.getEdges();
	
	for(var id in edges) { // Fine tune the data that will create the edge lines
		var edge = edges[id];
		var data = edge.getAttributes();
		var source = data.source;
		var target = data.target;
		var px = data.px;
		var py = data.py;
		
		// 1. Get the source and target node and their centers
		var sNode = nodes[data.source.id].getAttributes();
		var sNodeX = source.x = sNode.x + sNode.width/2 + source.dx;
		var sNodeY = source.y = sNode.y + sNode.height/2 + source.dy;
		var tNode = nodes[data.target.id].getAttributes();
		var tNodeX = target.x = tNode.x + tNode.width/2 + target.dx;
		var tNodeY = target.y = tNode.y + tNode.height/2 + target.dy;
		
		// 2. Find the width and the height of the element to be created
		var dx, dy, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
		if(sNodeX < minx)
			minx = sNodeX;
		if(sNodeX > maxx)
			maxx = sNodeX;
		if(sNodeY < miny)
			miny = sNodeY;
		if(sNodeY > maxy)
			maxy = sNodeY;
		if(tNodeX < minx)
			minx = tNodeX;
		if(tNodeX > maxx)
			maxx = tNodeX;
		if(tNodeY < miny)
			miny = tNodeY;
		if(tNodeY > maxy)
			maxy = tNodeY;
		var len = px.length;
		for(var i = 0; i < len; i++) {
			dx = px[i];
			dy = py[i];
			if(dx < minx)
				minx = dx;
			if(dx > maxx)
				maxx = dx;
			if(dy < miny)
				miny = dy;
			if(dy > maxy)
				maxy = dy;
		}
		data.x = minx;
		data.y = miny;
		data.width = maxx;
		data.height = maxy;
		
		// 3. Truncate the ends of the lines so that terminate at the nodes properly
		var obj = yWorks.clipPosition(graph, "source", data);
		if(obj != null) {
			source.x = obj.x;
			source.y = obj.y;
		}
		var obj = yWorks.clipPosition(graph, "target", data);
		if(obj != null) {
			target.x = obj.x;
			target.y = obj.y;
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
yWorks.clipPosition = function(graph, side, data) {
	var dx1, dy1; // The endpoint opposite the specified one
	if(side == "source") {
		dx1 = data.px[0] || data.target.x;
		dy1 = data.py[0] || data.target.y;
	}
	else if(side == "target") {
		var len1 = data.px.length-1;
		dx1 = data.px[len1] || data.source.x;
		dy1 = data.py[len1] || data.source.y;
	}
	else // Error checking, in case side data was passed incorrectly
		return null;
	
	var sideData = data[side];
	var bounds = graph.getNode([sideData.id]).getBounds(); // A format that describes the perimeter of the node assigned to the endpoint
	var dx0 = sideData.x;
	var dy0 = sideData.y;
	
	var bx = +bounds.x, by = +bounds.y, bw = +bounds.width, bh = +bounds.height, bxw = bx + bw, byh = by + bh;
	var dat = [ [dx0,dy0, dx1,dy1, bx,by, bxw,by],
				[dx0,dy0, dx1,dy1, bxw,by, bxw,byh],
				[dx0,dy0, dx1,dy1, bx,byh, bxw,byh],
				[dx0,dy0, dx1,dy1, bx,by, bx,byh]]; // Array of Arrays of coordinates describing (0-3) the edge and (4-7) the decomposed perimeter of the Node
	var collisionIndex = -1;
	var rtn = [];
	for(var i = 0, j= 4; i < j; i++) {
		rtn.push( yWorks.linearIntersect.apply(yWorks, dat[i]) );
		if(rtn[i].intersects) {
			if(collisionIndex > -1) {
				if(rtn[collisionIndex].x != rtn[i].x || rtn[collisionIndex].y != rtn[i].y) // If found the same point, assume a corner and overlook; else return failure
					return null;
			}
			else
				collisionIndex = i;
		}
	}
	return rtn[collisionIndex];
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
 * 		a[x,y] + S<bax,bay> = c[x,y] + T<dcx,dcy>
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
yWorks.getBasicGeometry = function(attributes, xml) {
	var g;
	g = xml.getElementsByTagName("y:Geometry")[0];
	attributes.x = +g.getAttribute("x");
	attributes.y = +g.getAttribute("y");
	attributes.width = +g.getAttribute("width");
	attributes.height = +g.getAttribute("height");
	g = xml.getElementsByTagName("y:Fill")[0];
	attributes.bgColor = g.getAttribute("color");
	attributes.color2 = g.getAttribute("color2");
	attributes.transparent = g.getAttribute("transparent");
	g = xml.getElementsByTagName("y:BorderStyle")[0];
	attributes.borderColor = g.getAttribute("color") || "none";
	attributes.borderStyle = g.getAttribute("type");
	attributes.borderWidth = +g.getAttribute("width");
}

/**
 * Extract data related to visualization customization from the xml.
 * @protected
 * @static
 * @param {Object} attributes - contains the data pertinent to this element
 * @param {XML} xml - the original markup of this element
 */
yWorks.getStyleProperties = function(attributes, xml) {
	var style = attributes.style = {};
	var g = xml.getElementsByTagName("y:StyleProperties")[0];
	if(g) {
		g = g.getElementsByTagName("y:Property");
		for(var i = 0, j = g.length; i < j; i++) {
			var name = g[i].getAttribute("name");
			var value = g[i].getAttribute("value");
			style[name] = value;
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
		
		note.align = label.getAttribute("alignment");
		note.autoSizePolicy = label.getAttribute("autoSizePolicy") == "content";
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
 */
yWorks.createLabels = function(attributes, container) {
	var notes = attributes.notes || [];
	
	for(var i = 0, j = notes.length; i < j; i++) {
		var note = notes[i];
		var notediv = document.createElement("div"), style = null;
		notediv.id = attributes.id+"-label-"+i;
		var content = yWorks.splitOnNewLines(notediv, note.content, "yWorks note entry");
		if(content.length) {
			notediv.className = "yWorks note content";
			style = notediv.style;
			style.left = note.x+"px";
			style.top = note.y+"px";
			style.width = note.width+"px";
			style.height = note.height+"px";
			style["font-color"] = note.fontColor;
			style["font-family"] = note.fontFamily += ", Arial, serif";
			style["font-size"] = note.fontSize+"px";
			style["color"] = note.fontColor;
			var fontStyle = note.fontStyle || "";
			if(fontStyle.search("[b|B]old") != -1)
				style["font-weight"] = " bold";
			if(fontStyle.search("[i|I]talic") != -1)
				style["font-style"] += " italic";
			style["text-align"] = note.textAlign;
			if(note.hasLineColor) {
				style["border-style"] = "solid";
				style["border-color"] = note.lineColor;
			}
			style["background-color"] = note.color1;
			style["visibility"] = note.visible ? "inherit" : "hidden";
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
 * The representation of a UML class block.
 * @override
 */
UMLClassNode.prototype = new Representation();
UMLClassNode.prototype.constructor = UMLClassNode;
function UMLClassNode(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
UMLClassNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getBasicGeometry(attributes, xml);
	// TODO: certain aspects of the node's data is read in supporting functions but was original read straight from the source; replace the below code where necessary
	var g;
	g = xml.getElementsByTagName("y:NodeLabel")[0];
	attributes.textAlign = g.getAttribute("alignment");
	attributes.fontFamily = g.getAttribute("fontFamily");
	attributes.fontSize = +g.getAttribute("fontSize");
	attributes.fontStyle = g.getAttribute("fontStyle");
	attributes.fontColor = g.getAttribute("textColor");
	attributes.name = g.firstChild.nodeValue;
	g = xml.getElementsByTagName("y:UML")[0];
	attributes.stereotype = g.getAttribute("stereotype");
	attributes.constraint = g.getAttribute("constraint");
	attributes.clipContent = g.getAttribute("clipContent");
	attributes.use3DEffect = g.getAttribute("use3DEffect") == "true";
	attributes.omitDetails = g.getAttribute("omitDetails") == "true";
	g = xml.getElementsByTagName("y:AttributeLabel")[0].firstChild;
	attributes.properties = g ? g.textContent : null;
	g = xml.getElementsByTagName("y:MethodLabel")[0].firstChild;
	attributes.methods = g ? g.textContent : null;
	
	return attributes;
}

/**
 * Create an HTML component to represent this UML class block.
 * @override
 */
UMLClassNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var cwidth = attr.width+"px";
	var stereotype = attr.stereotype;
	var constraint = attr.constraint;
	var properties = attr.properties;
	var methods = attr.methods;
	var content = properties || methods;
	var omitDetails = attr.omitDetails;
	var fontStyle = attr.fontStyle;
	var borderColor = attr.borderColor;
	
	var borderStyle = attr.borderStyle; // Attribute border-style needs better parsing for CSS
	if(attr.use3DEffect)
		borderStyle = "outset";
	else if(borderStyle == "dashed_dotted")
		borderStyle = "dashed";
	else if(borderStyle == "line")
		borderStyle = "solid";
	var overflow = attr.clipContent=="true" ? "hidden" : "visible"; // Attribute overflow needs better parsing for CSS
	var fontFamily = attr.fontFamily += ", Arial, serif"; // Attribute font-family needs better parsing for CSS (and a fallback)
	
	// uml frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks uml";
	
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = this.id+"-shape";
	contentNode.className = "yWorks uml frame";
	style = contentNode.style;
	style.left = attr.x+"px";
	style.top = attr.y+"px";
	style.width = cwidth
	style.height = attr.height+"px";
	style["background-color"] = attr.bgColor;
	style["border-color"] = borderColor;
	style["border-style"] = borderStyle;
	style["border-width"] = attr.borderWidth+"px";
	style.transparent = attr.transparent;
	style.overflow = overflow;
	containerNode.appendChild(contentNode);
	
	// uml stereotype
	var featureNode = document.createElement("div");
	featureNode.id = this.id+"-stereotype";
	featureNode.className = "yWorks uml stereotype";
	featureNode.width = cwidth;
	if(stereotype)
		featureNode.appendChild(document.createTextNode("<<"+stereotype+">>"));
	contentNode.appendChild(featureNode);
	
	// uml class name
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-name";
	featureNode.className = "yWorks uml name";
	featureNode.width = cwidth;
	style = featureNode.style;
	style.fontColor = attr.fontColor;
	style.fontFamily = fontFamily;
	style.fontWeight = "";
	if(fontStyle.search("[b|B]old") != -1)
		style.fontWeight += " bold";
	if(fontStyle.search("[i|I]talic") != -1)
		style.fontStyle += " italic";
	style.fontSize = attr.fontSize+"px";
	style.textAlign = attr.textAlign;
	featureNode.appendChild(document.createTextNode(attr.name));
	contentNode.appendChild(featureNode);
	
	// uml constraint
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-constraint";
	featureNode.className = "yWorks uml constraint";
	featureNode.width = cwidth;
	if(constraint)
		featureNode.appendChild(document.createTextNode("{"+constraint+"}"));
	contentNode.appendChild(featureNode);
	
	// uml content divider
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-topDivider";
	if(content && !omitDetails) {
		featureNode.className = "yWorks uml divider";
		featureNode.width = cwidth;
		var style = featureNode.style;
		style["border-top-color"] = borderColor;
	}
	contentNode.appendChild(featureNode);
	
	//uml properties	
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-properties";
	featureNode.className = "yWorks uml properties";
	featureNode.width = cwidth;
	if(properties && !omitDetails) {
		yWorks.splitOnNewLines(featureNode, properties, "yWorks uml entry");
	}
	contentNode.appendChild(featureNode);
	
	// uml content divider	
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-bottomDivider";
	if(content && !omitDetails) {
		featureNode.className = "yWorks uml divider";
		featureNode.width = cwidth;
		var style = featureNode.style;
		style["border-top-color"] = attr.borderColor;
	}
	contentNode.appendChild(featureNode);
	
	// uml methods
	featureNode = document.createElement("div");
	featureNode.id = this.id+"-methods";
	featureNode.className = "yWorks uml methods";
	featureNode.width = cwidth;
	if(methods && !omitDetails) {
		yWorks.splitOnNewLines(featureNode, methods, "yWorks uml entry");
	}
	contentNode.appendChild(featureNode);
	return containerNode;
}


/**
 * The representation of a UML note block.
 * (I do not believe this is a standard UML component.  It is probably a product of the namespace solely.)
 * @override
 */
UMLNoteNode.prototype = new Representation();
UMLNoteNode.prototype.constructor = UMLNoteNode;
function UMLNoteNode(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
UMLNoteNode.prototype.readXML = function(xml) {
	var attributes = {};
	attributes.id = xml.getAttribute("id");
	yWorks.getBasicGeometry(attributes, xml);
	yWorks.getLabels(attributes, xml);
	return attributes;
}

/**
 * Create an HTML component to represent this UML note block.
 * @override
 */
UMLNoteNode.prototype.createElement = function(attr) {
	var cattr = attr || this.data || {};
	var svgns = "http://www.w3.org/2000/svg";
	var x = cattr.x, y = cattr.y;
	var w = cattr.width, h = cattr.height;
	var bgColor = cattr.bgColor, bdColor = cattr.borderColor, bdWidth = cattr.borderWidth;
	var lineStyle = yWorks.createSVGLinePattern(cattr.borderStyle, bdWidth);
	
	var borderStyle = cattr.borderStyle; // Attribute border-style needs better parsing for CSS
	if(!bdColor || bdColor == "none")
		borderStyle = "none";
	else if(borderStyle == "dashed_dotted")
		borderStyle = "dashed";
	else if(borderStyle == "line")
		borderStyle = "solid";
	
	// uml note frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks note";
	
	// uml note background
	var contentNode = document.createElement("div");
	contentNode.className = "yWorks note frame";
	contentNode.id = cattr.id+"-shape";
	style = contentNode.style;
	style.left = cattr.x+"px";
	style.top = cattr.y+"px";
	style.width = cattr.width+"px";
	style.height = cattr.height+"px";
	containerNode.appendChild(contentNode);
	
	var svg = document.createElementNS(svgns, "svg"), style = null;
	svg.setAttributeNS(null, "width", w+1);
	svg.setAttributeNS(null, "height", h+1);
	style = svg.style;
	style.left = x+"px";
	style.top = y+"px";
	contentNode.appendChild(svg);
	
	var path = document.createElementNS(svgns, "path"), d = null; // Outline
	d = "";
	d += "M 0 0";
	d += " L "+(w-14)+" 0";
	d += " L "+(w)+" "+(14);
	d += " L "+(w)+" "+(h);
	d += " L 0 "+(h);
	d += " L 0 0 Z"
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", lineStyle);
	style = path.style;
	style.fill = yWorks.setupLinearGradient(svg, {id:this.id+"_gradient", width:w, height:h, color1:cattr.bgColor, color2:cattr.color2}).color;
	style.stroke = bdColor;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Folded corner
	d = "";
	d += "M "+(w-14)+" 0";
	d += " L "+(w-14)+" "+(14);
	d += " L "+(w)+" "+(14);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", lineStyle);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	svg.appendChild(path);
	
	// uml note content
	yWorks.createLabels(cattr, containerNode);
	return containerNode;
}


/**
 * The representation of a number of geometric shapes.
 * @override
 */
ShapeNode.prototype = new Representation();
ShapeNode.prototype.constructor = ShapeNode;
function ShapeNode(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
ShapeNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getBasicGeometry(attributes, xml);
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
	var cattr = attr || this.data || {};
	var bgColor = cattr.bgColor, bdColor = cattr.borderColor, bdWidth = cattr.borderWidth;
	
	var bdStyle = cattr.borderStyle; // Attribute border-style needs better parsing for CSS
	if(bdStyle == "dashed_dotted")
		bdStyle = "dashed";
	else if(bdStyle == "line")
		bdStyle = "solid";
	
	// shape frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks shape";
	
	// shape form
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = this.id+"-shape";
	contentNode.className = "yWorks shape frame";
	style = contentNode.style;
	style.left = cattr.x+"px";
	style.top = cattr.y+"px";
	style.width = cattr.width+"px";
	style.height = cattr.height+"px";
	contentNode.appendChild( ShapeNode.createShape(cattr.shape, cattr) );
	containerNode.appendChild(contentNode);
	
	//shape text
	yWorks.createLabels(cattr, containerNode);
	return containerNode;
}

/**
 * Select the shape for the representation.
 * This hub function branches to the specific shape to be drawn in SVG.
 * @private
 * @static
 * @param {String} shape - the name of the shape to be drawn
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
ShapeNode.createShape = function(shape, attributes) {
	var cattr = attributes || {};
	
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), style = null;
	svg.setAttributeNS(null, "width", cattr.width+1);
	svg.setAttributeNS(null, "height", cattr.height+1);
	style = svg.style;
	style.left = (cattr.x - 1)+"px";
	style.top = (cattr.y - 1)+"px";
	
	switch(shape) {
		case "diamond":
			ShapeNode.diamondShape(svg, shape, cattr);
			break;
		case "octagon":
			ShapeNode.octagonShape(svg, shape, cattr);
			break;
		case "trapezoid":
		case "trapezoid2":
			ShapeNode.trapezoidShape(svg, shape, cattr);
			break;
		case "triangle":
			ShapeNode.triangleShape(svg, shape, cattr);
			break;
		case "hexagon":
			ShapeNode.hexagonShape(svg, shape, cattr);
			break;
		case "parallelogram":
			ShapeNode.parallelogramShape(svg, shape, cattr);
			break;
		case "ellipse":
			ShapeNode.ellipseShape(svg, shape, cattr);
			break;
		case "rectangle":
		case "rectangle3d":
		case "roundrectangle":
			ShapeNode.rectangleShape(svg, shape, cattr);
			break;
		default:
			console.log("No graphics for "+cattr.id+"; please construct proper "+shape+" element");
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
	var ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse"), style = null;
	var rx = attr.width/2;
	var ry = attr.height/2;
	ellipse.setAttributeNS(null, "rx", rx);
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", rx + 0.5);
	ellipse.setAttributeNS(null, "cy", ry + 0.5);
	
	style = ellipse.style;
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor;
	
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
	var width = attr.width;
	var height = attr.height;
	var svgns = "http://www.w3.org/2000/svg";
	var borderColor = attr.borderColor || "none";
	
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", width);
	rect.setAttributeNS(null, "height", height);
	if(shape.indexOf("round") == 0) {
		rect.setAttributeNS(null, "rx", 5); // These are always 5
		rect.setAttributeNS(null, "ry", 5);
	}
	rect.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = borderColor;
	style.position = "absolute";
	
	svg.appendChild(rect);
	
	if(shape.search("3d") != -1) {
		var polyline = document.createElementNS(svgns, "polyline");
		var points = "";
		points += "0,"+height;
		points += " 0,1";
		points += " "+width+",1";
		polyline.setAttributeNS(null, "points", points);
		style = polyline.style;
		style.fill = "none";
		style.left = "1px";
		style["stroke-width"] = 1; //attr.borderWidth;
		style.stroke = yWorks.shadeBlendConvert(0.5, borderColor, "#FFFFFF");
		style.position = "absolute";
		svg.appendChild(polyline);
		
		polyline = document.createElementNS(svgns, "polyline");
		points = "";
		points += "0,"+height;
		points += " "+width+","+height;
		points += " "+width+",0";
		polyline.setAttributeNS(null, "points", points);
		style = polyline.style;
		style.fill = "none";
		style.left = "1px";
		style["stroke-width"] = 1; //attr.borderWidth;
		style.stroke = yWorks.shadeBlendConvert(-0.5, borderColor, "#000000");
		style.position = "absolute";
		svg.appendChild(polyline);
	}
	else
		style.stroke = borderColor;
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var tenthWidth = width/10;
	var d = "";
	d += "M "+tenthWidth+" 0";
	d += " L "+width+" 0";
	d += " L "+(width-tenthWidth)+" "+height;
	d += " L 0 "+height+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
	svg.appendChild(path);
}

/**
 * Draw a hexagon shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} shape - the specific type of shape being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
ShapeNode.hexagonShape = function(svg, shape, attr) {
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var tenthWidth = width/10;
	var halfHeight = height/2;
	var d = "";
	d += "M "+tenthWidth+" 0";
	d += " L "+(width-tenthWidth)+" 0";
	d += " L "+width+" "+halfHeight;
	d += " L "+(width-tenthWidth)+" "+height;
	d += " L "+tenthWidth+" "+height;
	d += " L 0 "+halfHeight;
	d += " L "+tenthWidth+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var halfWidth = width/2;
	var d = "";
	d += "M "+halfWidth+" 0";
	d += " L "+width+" "+height;
	d += " L 0 "+height;
	d += " L "+halfWidth+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var fourthWidth = width/4;
	var d = "";
	if(shape.search("2") == -1) {
		d += "M "+fourthWidth+" 0";
		d += " L "+(width - fourthWidth)+" 0";
		d += " L "+width+" "+height;
		d += " L 0 "+height;
		d += " L "+fourthWidth+" 0 Z";
	}
	else {
		d += "M 0 0";
		d += " L "+width+" 0";
		d += " L "+(width - fourthWidth)+" "+height;
		d += " L "+fourthWidth+" "+height;
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var thirdWidth = width/3;
	var twoThirdWidth = 2 * thirdWidth;
	var thirdHeight = height/3;
	var twoThirdHeight = 2 * thirdHeight;
	var d = "";
	d += "M "+thirdWidth+" 0";
	d += " L "+twoThirdWidth+" 0";
	d += " L "+width+" "+thirdHeight;
	d += " L "+width+" "+twoThirdHeight;
	d += " L "+twoThirdWidth+" "+height;
	d += " L "+thirdWidth+" "+height;
	d += " L 0 "+twoThirdHeight;
	d += " L 0 "+thirdHeight;
	d += " L "+thirdWidth+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var width = attr.width;
	var height = attr.height;
	var halfWidth = width/2;
	var halfHeight = height/2;
	var d = "";
	d += "M "+halfWidth+" 0";
	d += " L "+width+" "+halfHeight;
	d += " L "+halfWidth+" "+height;
	d += " L 0 "+halfHeight;
	d += " L "+halfWidth+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	
	style = path.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = attr.bgColor || "none";
	style.stroke = attr.borderColor || "none";
	style.position = "absolute";
	
	svg.appendChild(path);
}


/**
 * The representation of a number of shapes.
 * Business process model (BPM*) objects are included, as are flowchart elements and designs that assist in establishing entity relationship.
 * Generic shapes encompass a variety of form and logic entities.
 * @override
 */
GenericNode.prototype = new Representation();
GenericNode.prototype.constructor = GenericNode;
function GenericNode(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
GenericNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getBasicGeometry(attributes, xml);
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
	var cattr = attr || this.data || {};
	var x = cattr.x, y = cattr.y;
	var w = cattr.width, h = cattr.height;
	var bgColor = cattr.bgColor, bdColor = cattr.borderColor, bdWidth = cattr.borderWidth;
	
	var bdStyle = cattr.borderStyle; // Attribute border-style needs better parsing for CSS
	if(bdStyle == "dashed_dotted")
		bdStyle = "dashed";
	else if(bdStyle == "line")
		bdStyle = "solid";
	
	// shape frame
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks generic";
	
	// shape form
	var contentNode = document.createElement("div");
	contentNode.id = cattr.id+"-shape";
	contentNode.className = "yWorks generic frame";
	style = contentNode.style;
	style.left = x+"px";
	style.top = y+"px";
	style.width = w+"px";
	style.height = h+"px";
	contentNode.appendChild( GenericNode.createConfiguration(cattr.configuration, cattr) );
	containerNode.appendChild(contentNode);
	
	yWorks.createLabels(cattr, containerNode);
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
GenericNode.createConfiguration = function(configuration, attributes) {
	var cattr = attributes || {};
	
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), style = null;
	svg.setAttributeNS(null, "width", cattr.width+1);
	svg.setAttributeNS(null, "height", cattr.height+1);
	style = svg.style;
	style.left = (cattr.x - 1)+"px";
	style.top = (cattr.y - 1)+"px";
	
	switch(configuration) {
		// Flowchart elements
		case "com.yworks.flowchart.cloud":
			GenericNode.createFlowChartCloud(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.terminator":
			GenericNode.createFlowChartTerminator(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.data":
			GenericNode.createFlowChartParallelogram(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.manualOperation":
			GenericNode.createFlowChartTrapazoid(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.offPageReference":
			GenericNode.createFlowChartPentagon(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.annotation":
			GenericNode.createFlowChartSpecialRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.manualInput":
			GenericNode.createFlowChartAngledTopRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.dataBase":
			GenericNode.createFlowChartCylinder(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.display":
			GenericNode.createFlowChartDisplay(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.decision":
			GenericNode.createFlowChartDiamond(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.document":
		case "com.yworks.flowchart.paperType":
			GenericNode.createFlowChartCurvedRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.delay":
		case "com.yworks.flowchart.directData":
		case "com.yworks.flowchart.storedData":
			GenericNode.createFlowChartCurvedSideRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.userMessage":
		case "com.yworks.flowchart.networkMessage":
		case "com.yworks.flowchart.preparation":
			GenericNode.createFlowChartShavedSideRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.loopLimit":
		case "com.yworks.flowchart.loopLimitEnd":
		case "com.yworks.flowchart.card":
			GenericNode.createFlowChartShavedCornerRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.process":
		case "com.yworks.flowchart.predefinedProcess":
		case "com.yworks.flowchart.internalStorage":
			GenericNode.createFlowChartRectangle(svg, configuration, cattr);
			break;
		case "com.yworks.flowchart.start1":
		case "com.yworks.flowchart.start2":
		case "com.yworks.flowchart.sequentialData":
		case "com.yworks.flowchart.onPageReference":
			GenericNode.createFlowChartCircle(svg, configuration, cattr);
			break;
		// Entity relationship elements
		case "com.yworks.entityRelationship.attribute":
			GenericNode.createEntityAttribute(svg, configuration, cattr);
			break;
		case "com.yworks.entityRelationship.small_entity":
			GenericNode.createEntitySmall(svg, configuration, cattr);
			break;
		case "com.yworks.entityRelationship.big_entity":
			GenericNode.createEntityBig(svg, configuration, cattr);
			break;
		case "com.yworks.entityRelationship.relationship":
			GenericNode.createEntityRelationship(svg, configuration, cattr);
			break;
		// Modern node elements
		case "BevelNode":
		case "BevelNodeWithShadow":
		case "BevelNode2":
		case "BevelNode3":
			GenericNode.createBevel(svg, configuration, cattr);
			break;
		case "ShinyPlateNode":
		case "ShinyPlateNodeWithShadow":
		case "ShinyPlateNode2":
		case "ShinyPlateNode3":
			GenericNode.createPlate(svg, configuration, cattr);
			break;
		// BPMN elements
		case "com.yworks.bpmn.Gateway":
		case "com.yworks.bpmn.Gateway.withShadow":
			GenericNode.createGateway(svg, configuration, cattr);
			break;
		case "com.yworks.bpmn.Event":
		case "com.yworks.bpmn.Event.withShadow":
			GenericNode.createEvent(svg, configuration, cattr);
			break;
		case "com.yworks.bpmn.Conversation":
		case "com.yworks.bpmn.Conversation.withShadow":
			GenericNode.createConversation(svg, configuration, cattr);
			break;
		case "com.yworks.bpmn.Artifact":
		case "com.yworks.bpmn.Artifact.withShadow":
			GenericNode.createArtifact(svg, configuration, cattr);
			break;
		default:
			console.log("No graphics for "+cattr.id+"; please construct proper "+configuration+" element");
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
GenericNode.createArtifact = function(svg, configuration, attr) {
	var type = attr.style && attr.style["com.yworks.bpmn.type"];
	switch(type) {
		case "ARTIFACT_TYPE_DATA_OBJECT":
			GenericNode.createArtifactDataObject(svg, type, attr);
			break;
		case "ARTIFACT_TYPE_ANNOTATION":
			GenericNode.createFlowChartSpecialRectangle(svg, type, attr);
			break;
		case "ARTIFACT_TYPE_REPLY_MESSAGE":
		case "ARTIFACT_TYPE_REQUEST_MESSAGE":
			GenericNode.createArtifactMessage(svg, type, attr);
			break;
		case "ARTIFACT_TYPE_DATA_STORE":
			GenericNode.createDataStore(svg, type, attr);
			break;
		default:
			console.log("Missing type graphics for "+cattr.id+"; please construct proper "+configuration+" element");
	}
}

/**
 * Select (and draw) the detailing for a gateway entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to gateway-type drawings.
 * Unlike an earlier hub function, this one implements SVG directly rather than pass responsibility onto another function.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayDetails = function(svg, attr) {
	var w = attr.width, w2 = w/2;
	var h = attr.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var style = null, dashed = null;
	var svgns = "http://www.w3.org/2000/svg";
	
	var color1 = attr.style["com.yworks.bpmn.icon.fill"], color2 = attr.style["com.yworks.bpmn.icon.fill2"];
	var borderWidth = attr.borderWidth;
	var bdColor = attr.style["com.yworks.bpmn.icon.line.color"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:attr.width, height:attr.height, color1:color1, color2:color2}).color;
	var type = attr.style["com.yworks.bpmn.type"];
	var boldLineWidth = 0.056 * len;
	switch(type) {
		case "GATEWAY_TYPE_PLAIN": // Nothing
			break;
		
		case "GATEWAY_TYPE_INCLUSIVE":
			lenSpan -= boldLineWidth/2;
			var circle = document.createElementNS(svgns, "circle"); // Bold 'o'
			circle.setAttributeNS(null, "cx", w2);
			circle.setAttributeNS(null, "cy", h2);
			circle.setAttributeNS(null, "r", lenSpan);
			style = circle.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 0.067 * len;
			svg.appendChild(circle);
			break;
			
		case "GATEWAY_TYPE_PARALLEL_EVENT_BASED_EXCLUSIVE_START_PROCESS":
			var circle = document.createElementNS(svgns, "circle"); // Circle
			circle.setAttributeNS(null, "cx", w2);
			circle.setAttributeNS(null, "cy", h2);
			circle.setAttributeNS(null, "r", lenSpan);
			style = circle.style;
			style.fill = bgColor;
			style.stroke = bdColor;
			style["stroke-width"] = 1;
			svg.appendChild(circle);
			
			var plusInner = 0.044 * len2, plusOuter = 0.356 * len2;
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
			break;

		case "GATEWAY_TYPE_DATA_BASED_EXCLUSIVE":
			lenSpan -= 0.5 * boldLineWidth;
			var wLenSpan = 0.244 * len2;
			var path = document.createElementNS(svgns, "path"); // Bold 'x'
			var d = "";
			d += "M "+(w2-wLenSpan)+" "+(h2-lenSpan);
			d += " L "+(w2+wLenSpan)+" "+(h2+lenSpan);
			d += "M "+(w2+wLenSpan)+" "+(h2-lenSpan);
			d += " L "+(w2-wLenSpan)+" "+(h2+lenSpan);
			path.setAttributeNS(null, "d", d);
			path.setAttributeNS(null, "stroke-linecap", "round");
			style = path.style;
			style.fill = "none";
			style.stroke = bdColor;
			style["stroke-width"] = boldLineWidth;
			svg.appendChild(path);
			break;
		
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE_START_PROCESS":
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE":
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
			
			// Pentagon
			var lenPenta = 0.156 * len;
			var xPentaA = Math.cos(0.314) * lenPenta, yPentaA = Math.sin(0.314) * lenPenta;
			var xPentaB = Math.sin(0.628) * lenPenta, yPentaB = Math.cos(0.628) * lenPenta;
			var path = document.createElementNS(svgns, "path");
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
			break;
		
		case "GATEWAY_TYPE_PARALLEL":
		case "GATEWAY_TYPE_COMPLEX":
			var path = document.createElementNS(svgns, "path"); // Bold '+'
			var d = "";
			d += "M "+(w2)+" "+(h2-lenSpan);
			d += " L "+(w2)+" "+(h2+lenSpan); // Vertical
			d += "M "+(w2+lenSpan)+" "+(h2);
			d += " L "+(w2-lenSpan)+" "+(h2); // Horizontal
			if(type == "GATEWAY_TYPE_COMPLEX") {  // Bold 'x', completing an asterisk '*'
				var dLenSpan = lenSpan * Math.cos(Math.PI/4);
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
			break;
		
		default:
			console.log("No graphics for "+this.id+" characteristic - '"+type+"'");
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
GenericNode.createEventDetails = function(svg, attr) {
	var w = attr.width, w2 = w/2 + 1;
	var h = attr.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	var circle = null, d = "", style = null, dashed = null;
	var svgns = "http://www.w3.org/2000/svg";
	var borderColor = attr.borderColor;
	
	var type1 = attr.style["com.yworks.bpmn.characteristic"]; // Outline design
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
	
	var color1 = attr.style["com.yworks.bpmn.icon.fill"], color2 = attr.style["com.yworks.bpmn.icon.fill2"];
	var borderWidth = attr.borderWidth;
	var bdColor = attr.style["com.yworks.bpmn.icon.line.color"];
	var detailColor = bdColor;
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:attr.width, height:attr.height, color1:color1, color2:color2}).color;
	if(type1 == "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING" || type1 == "EVENT_CHARACTERISTIC_END") {
		bgColor = "black";
		detailColor = "white";
	}
	var type2 = attr.style["com.yworks.bpmn.type"]; // Central emblem
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
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width/2;
	var h = attr.height/2;
	var rx = Math.min(w, h);
	var ry = rx;
	
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	if(configuration.search("start1") != -1) { // The start1 element is an ellipse; the rest are circles
		rx = w;
		ry = h;
	}
	ellipse.setAttributeNS(null, "rx", rx); // It's a circle that is typically longer than it is wide
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", w + 0.5);
	ellipse.setAttributeNS(null, "cy", h + 0.5);
	style = ellipse.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(ellipse);
	
	// The sequential data element has a tail
	if(configuration.search("sequentialData") != -1) {
		var x = w+0.5, y = 2*h+0.5;
		var line = document.createElementNS(svgns, "line");
		line.setAttributeNS(null, "x1", x);
		line.setAttributeNS(null, "y1", y);
		line.setAttributeNS(null, "x2", x+rx);
		line.setAttributeNS(null, "y2", y);
		
		style = line.style;
		style["stroke-width"] = attr.borderWidth;
		style.fill = "none";
		style.stroke = attr.borderColor;
		
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
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var style = null;
	if(w <= h) { // Due to constraints, we're making an ellipse
		w /= 2;
		h /= 2;
		var ellipse = document.createElementNS(svgns, "ellipse");
		ellipse.setAttributeNS(null, "rx", w);
		ellipse.setAttributeNS(null, "ry", h);
		ellipse.setAttributeNS(null, "cx", w + 0.5);
		ellipse.setAttributeNS(null, "cy", h + 0.5);
		
		style = ellipse.style;
		style["stroke-width"] = attr.borderWidth;
		yWorks.setupLinearGradient(svg, ellipse, attr);
		style.stroke = attr.borderColor;
		
		svg.appendChild(ellipse);
	}
	else { // The terminator is pill-shaped
		var exlen = Math.abs(w - h);
		var r = h/2;
		var n = 2/3 * h;
		var path = document.createElementNS(svgns, "path");
		var d = "";
		d += "M "+r+" 0";
		d += "L "+(r+exlen)+" 0";
		d += " c "+ n+" 0 "+ n+" "+ h+" 0 "+ h;
		d += "L "+(r)+" "+h;
		d += " c "+(-n)+" 0 "+(-n)+" "+(-h)+" 0 "+(-h) +" Z";
		path.setAttributeNS(null, "d", d);
		
		style = path.style;
		style["stroke-width"] = attr.borderWidth;
		var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
		style.fill = ret.color;
		style.stroke = attr.borderColor;
		
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
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
		style = line.style;
		style["stroke-width"] = attr.borderWidth;
		style.fill = "none";
		style.stroke = attr.borderColor;
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
		style = line.style;
		style["stroke-width"] = attr.borderWidth;
		style.fill = "none";
		style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var beginLoop = configuration.search("loopLimit") != -1;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	var n = 9;
	if(w < 18 || h < 18)
		n = Math.min(w, h)/2;
	if(beginLoop || configuration.search("card") != -1) {
		d = "M "+n+" 0";
		if(beginLoop) {
			d += " L "+(w-n)+" 0"; // The graphic for loopLimit has an opposing shaved corner
			d += " L "+w+" "+n;
		}
		else
			d += " L "+w+" 0"; // The graphic for card has a normal corner
		d += " L "+w+" "+h;
		d += " L 0 "+h;
		d += " L 0 "+n;
		d += " L "+n+" 0 Z";
	}
	else { // For loopLimitEnd (actually, an upside down loopLimit)
		d = "M 0 0";
		d += " L "+w+" 0";
		d += " L "+w+" "+(h-n);
		d += " L "+(w-n)+" "+h;
		d += " L "+n+" "+h;
		d += " L 0 "+(h-n);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var h2 = h/2;
	var preparation = configuration.search("preparation") != -1;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	var n = 9;
	if(preparation || configuration.search("userMessage") != -1) {
		d = "M "+(w-n)+" 0";
		d += " L "+w+" "+h2;
		d += " L "+(w-n)+" "+h;
		if(preparation) { // The graphic for preparation has opposing shaved sides
			d += " L "+n+" "+h;
			d += " L 0 "+h2;
			d += " L "+n+" 0";
		}
		else { // The graphic for userMessage has a flat left side
			d += " L 0 "+h;
			d += " L 0 0";
		}
		d += " L "+(w-n)+" 0 Z";
	}
	else { // For networkMessage
		d = "M 0 0";
		d += " L "+w+" 0";
		d += " L "+w+" "+h;
		d += " L 0 "+h;
		d += " L "+n+" "+h2;
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var n = 9;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 "+n;
	d += " L "+w+" 0";
	d += " L "+w+" "+h;
	d += " L 0 "+h;
	d += " L 0 "+n+" Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var h2 = h*2;
	
	var t = 4.5;
	var cx = w/4, cx3 = 3*cx;
	if(w/h2 < 1) {
		t += t * (Math.max(w/h2, 2) - 1);
	}
	else if(w/h2 > 1) {
		t *= Math.max(0.5*h2/w, 0.5);
	}
	var cy = t*3;
	var th = h - t;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+w+" "+th;
	d += " c "+(-cx)+" "+(-cy)+" "+(-cx3)+" "+(cy)+" "+(-w)+" 0";
	if(configuration.search("document") != -1) { // Documents are flat on top
		d += " L 0 0";
		d += " L "+w+" 0";
	}
	else { // Paper types have curves on top
		d += " L 0 "+t;
		d += " c "+(cx)+" "+(cy)+" "+(cx3)+" "+(-cy)+" "+w+" 0";
	}
	d += " L "+w+" "+th+" Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var n = 4.5;
	var wn = w - n;
	var h3 = h/3;
	var n15 = 1.5*n;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var d = "";
	d = "M "+wn+" 0";
	if(configuration.search("storedData") != -1) // Stored data curves inwards on the right side
		d += " c "+(-n15)+" "+h3+" "+(-n15)+" "+(2*h3)+" 0 "+h;
	else // Direct-access data and delays curve outwards on the right side
		d += " c "+n15+" "+h3+" "+n15+" "+(2*h3)+" 0 "+h;
	if(configuration.search("delay") != -1) { // Delays are flat on the left side
		d += " L 0 "+h;
		d += " L 0 0";
	}
	else { // Direct-access data and stored data have opposing curves on the left side
		d += " L "+n+" "+h;
		d += " c "+(-n15+1)+" "+(-h3)+" "+(-n15+1)+" "+(-2*h3)+" 0 "+(-h);
	}
	d += " L "+wn+" 0 Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(path);
	
	if(configuration.search("directData") != -1) { // A decorative curve like on the left side to simulate 3D (cylinder)
		path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		d = "";
		d += "M "+wn+" 0";
		d += " c "+(-n15)+" "+h3+" "+(-n15)+" "+(2*h3)+" 0 "+h;
		path.setAttributeNS(null, "d", d);
		style = path.style;
		style["stroke-width"] = attr.borderWidth;
		style.fill = "none";
		style.stroke = attr.borderColor;
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
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var w9 = Math.round(w/9);
	var h = attr.height;
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	style["stroke-width"] = 0;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = "none";
	svg.appendChild(rect);
	
	var polyline = document.createElementNS(svgns, "polyline");
	var points = w9+","+h+" 0,"+h+" 0,0 "+w9+",0";
	polyline.setAttributeNS(null, "points", points);
	style = polyline.style;
	style["stroke-width"] = attr.borderWidth;
	style.fill = "none";
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var h2 = h/2;
	var h3 = h/3;
	var rat = h/w;
	
	var w1 = 0.5*w; // Ideal w == h proportions; nothing special happens if h > w
	var w3 = 0.12*w;
	var w2 = w - w1 - w3;
	if(h < w) { // If h < w, w2 elongates while w1 and w3 get shorter	
		w2 += w3*rat + w1*rat;
		w1 *= (1 - rat);
		w3 *= (1 - rat);
	}
	var n = w3;
	var n15 = 1.5*n;
	var w12 = w1/2;
	var w14 = w1/4;
	var w126 = w12/6;
	var cx1 = -(w12 + w14 + rat);
	var cx2 = (w12 - w14 - rat);
	var cyw1 = -(w12 - w126);
	var cyw2 = -(w12 + w126);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var d = "";
	d = "M "+w1+" 0";
	d += " L "+(w1+w2)+" 0";
	d += " c "+n15+" "+h3+" "+n15+" "+(2*h3)+" 0 "+h;
	d += " L "+w1+" "+h;
	d += " c "+(cx1)+" "+(cyw1)+" "+(cx1)+" "+(cyw2)+" "+(-w1)+" "+(-h2);
	d += " c "+(cx2)+" "+(cyw1)+" "+(cx2)+" "+(cyw2)+" "+( w1)+" "+(-h2)+" Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var w8 = w/8;
	var w28 = 2*w8;
	var w68 = 6*w8;
	var h = attr.height;
	var h6 = h/6;
	
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d = "M 0 "+h6;
	d += " c "+(w28)+" "+(-h6)+" "+(w68)+" "+(-h6)+" "+w+" 0";
	d += " L "+w+" "+(5*h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	d += " L 0 "+h6+" Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path");
	d = "";
	d += "M "+w+" "+(h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	style.fill = "none";
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var w2 = w/2;
	var h = attr.height;
	var h2 = h/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+w2+" 0";
	d += " L "+w+" "+h2;
	d += " L "+w2+" "+h;
	d += " L 0 "+h2;
	d += " L "+w2+" 0 Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var n = 9;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+n+" 0";
	d += " L "+w+" 0";
	d += " L "+(w-n)+" "+h;
	d += " L 0 "+h;
	d += " L "+n+" 0 Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var n = 9;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 0";
	d += " L "+w+" 0";
	d += " L "+(w-n)+" "+h;
	d += " L "+n+" "+h;
	d += " L 0 0 Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	var h = attr.height;
	var w4 = w/4;
	var w34 = 3*w/4;
	var h2 = h/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+w4+" 0";
	d += " L "+w34+" 0";
	d += " L "+w34+" "+h2;
	d += " L "+2*w4+" "+h;
	d += " L "+w4+" "+h2;
	d += " L "+w4+" 0 Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
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
	var w = attr.width;
	
	this.createFlowChartCircle(svg, "start1", attr); // Yes, this is a cloud.
	var g = document.createElementNS("http://www.w3.org/2000/svg", "g");
	g.setAttributeNS(null, "font-size", w/4);
	g.setAttributeNS(null, "font-family", "sans-serif");
	g.setAttributeNS(null, "fill", "#C0C0C0");
	g.setAttributeNS(null, "stroke", "none");
	g.setAttributeNS(null, "text-anchor", "middle");
	svg.appendChild(g);
	
	var textElem = document.createElementNS("http://www.w3.org/2000/svg", "text");
	textElem.setAttributeNS(null, "x", w/2);
	textElem.setAttributeNS(null, "y", 2*attr.height/3);
	g.appendChild(textElem);
	
	textElem.appendChild(document.createTextNode("CLOUD")); // See?  Perfectly legit.
}

/**
 * Draw a business process model attribute entity for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityAttribute = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width, w2 = w/2, cx = w2 + 0.5;
	var h = attr.height, h2 = h/2, cy = h2 + 0.5;
	var rx = w2;
	var ry = h2;
	var strokeDashArray = yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth);
	
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	ellipse.setAttributeNS(null, "rx", rx);
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", cx);
	ellipse.setAttributeNS(null, "cy", cy);
	style = ellipse.style;
	style["stroke-width"] = attr.borderWidth;
	style["stroke-dasharray"] = strokeDashArray;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(ellipse);
	
	if(attr.style["doubleBorder"] && rx > 8 && ry > 8) {
		ellipse = document.createElementNS(svgns, "ellipse"), style = null;
		ellipse.setAttributeNS(null, "rx", rx - 3);
		ellipse.setAttributeNS(null, "ry", ry - 3);
		ellipse.setAttributeNS(null, "cx", cx);
		ellipse.setAttributeNS(null, "cy", cy);
		style = ellipse.style;
		style["stroke-width"] = attr.borderWidth;
		style["stroke-dasharray"] = strokeDashArray;
		style.fill = "none";
		style.stroke = attr.borderColor;
		svg.appendChild(ellipse);
	}
}

/**
 * Draw a business process model small entity for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntitySmall = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(rect);
	
	if(attr.style["doubleBorder"] && w > 8 && h > 8) {
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "x", 3);
		rect.setAttributeNS(null, "y", 3);
		rect.setAttributeNS(null, "width", w - 6);
		rect.setAttributeNS(null, "height", h - 6);
		style = rect.style;
		style.fill = "none";
		style.stroke = attr.borderColor;
		svg.appendChild(rect);
	}
}

/**
 * Draw a business process model big entity for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityBig = function(svg, configuration, attr) {
	var w = attr.width;
	var h = attr.height;
	var svgns = "http://www.w3.org/2000/svg";
	
	// Body
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", 5); // These are always 5
	rect.setAttributeNS(null, "ry", 5);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	if(h > 23) {
		var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
		style.fill = ret.color; // Rectangle bit
	}
	else
		style.fill = attr.color2; // Just the header section (see below)
	style.stroke = attr.borderColor;
	svg.appendChild(rect);
	
	// Header, not used if element is too short; there might be a way to set this up using svg clipping
	if(h > 23) {
		var path = document.createElementNS(svgns, "path");
		var d = "";
		d += "M 2 0";
		d += " L "+(w-2)+" 0";
		d += " L "+w+" 2"; // The curve is too miniscule to matter?
		d += " L "+w+" "+23;
		d += " L 0 "+23;
		d += " L 0 2";
		d += " L 2 0 Z";
		path.setAttributeNS(null, "d", d);
		style = path.style;
		style.left = "1px";
		style["stroke-width"] = attr.borderWidth;
		style.fill = attr.color2;
		style.stroke = attr.borderColor;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model entity relationship for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityRelationship = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width, w2 = w/2;
	var h = attr.height, h2 = h/2;
	
	var path = document.createElementNS(svgns, "path"), style = null, d = null;
	d = "";
	d = "M "+w2+" 0";
	d += " L "+w+" "+h2;
	d += " L "+w2+" "+h;
	d += " L 0 "+h2;
	d += " L "+w2+" 0 Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style["stroke-width"] = attr.borderWidth;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(path);
	
	if(attr.style["doubleBorder"] && w > 8 && h > 8) {
		path = document.createElementNS(svgns, "path");
		d = "";
		d = "M "+w2+" 4";
		d += " L "+(w-6)+" "+h2;
		d += " L "+w2+" "+(h-4);
		d += " L 6 "+h2;
		d += " L "+w2+" 4 Z";
		path.setAttributeNS(null, "d", d);
		style = path.style;
		style["stroke-width"] = attr.borderWidth;
		style.fill = "none";
		style.stroke = attr.borderColor;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model gateway for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createGateway = function(svg, configuration, attr) {
	var w = attr.width, w2 = w/2;
	var h = attr.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" "+(h2-len2);
	d += " L "+(w2+len2)+" "+(h2);
	d += " L "+(w2)+" "+(h2+len2);
	d += " L "+(w2-len2)+" "+(h2);
	d += " L "+(w2)+" "+(h2-len2)+" Z";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	style["stroke-width"] = attr.borderWidth;
	svg.appendChild(path);
	
	GenericNode.createGatewayDetails(svg, attr);
}

/**
 * Draw a business process model event for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEvent = function(svg, configuration, attr) {
	var w = attr.width, w2 = w/2;
	var h = attr.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // Base
	circle.setAttributeNS(null, "cx", w2+1);
	circle.setAttributeNS(null, "cy", h2+1);
	circle.setAttributeNS(null, "r", len2);
	var style = circle.style;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:attr.width, height:attr.height, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = "none";
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	GenericNode.createEventDetails(svg, attr);
}

/**
 * Draw a business process model conversation for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createConversation = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	
	var path = document.createElementNS(svgns, "path"), style = null;
	var w = attr.width, w2 = w/2, w21 = w2 + 1;
	var h = attr.height, h2 = h/2, h21 = h2 + 1;
	var len = Math.min(w, h), len2 = Math.min(w2, h2), len4 = len/4;
	var lenh = 0.866 * len2; // Cosine
	
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
	path.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(attr.borderStyle, attr.borderWidth));
	var style = path.style;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:w, height:h, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	style["stroke-width"] = attr.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a business process model data object for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactDataObject = function(svg, type, attr) {
	var w = attr.width;
	var h = attr.height;
	var spec = attr.style["com.yworks.bpmn.dataObjectType"];
	var collection = attr.style["com.yworks.bpmn.marker1"];
	if(spec.search(/(IN|OUT)PUT/i) != -1) { // Spec ..._PLAIN can scale forever
		var maxh = (collection == "BPMN_MARKER_PARALLEL" ? 37 : 21);
		w = Math.max(w, 32);
		h = Math.max(h, maxh);
	}
	else if(collection == "BPMN_MARKER_PARALLEL") {
		w = Math.max(w, 15);
		h = Math.max(h, 17.5);
	}
	var shrt = Math.min(w, h);
	var foldLen = shrt*0.5 - shrt*0.1;
	var svgns = "http://www.w3.org/2000/svg";
	var borderColor = attr.borderColor;
	var borderWidth = attr.borderWidth;
	var strokeDash = yWorks.createSVGLinePattern(attr.borderStyle, borderWidth);
	
	// Outline
	var path = document.createElementNS(svgns, "path"), d = "", style = null;
	d += "M 1 1";
	d += " L "+(w-foldLen)+" 1";
	d += " L "+(w)+" "+(foldLen);
	d += " L "+(w)+" "+(h);
	d += " L 1 "+(h);
	d += " L 1 1 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", strokeDash);
	style = path.style;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:w, height:h, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style.stroke = borderColor;
	style["stroke-width"] = borderWidth;
	svg.appendChild(path);
	
	// Folded-over corner
	path = document.createElementNS(svgns, "path");
	d = "";
	d += "M "+(w-foldLen)+" 1";
	d += " L "+(w-foldLen)+" "+(foldLen);
	d += " L "+(w)+" "+(foldLen);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", strokeDash);
	style = path.style;
	style.fill = "none";
	style.stroke = borderColor;
	style["stroke-width"] = borderWidth;
	svg.appendChild(path);
	
	if(spec.search(/(IN|OUT)PUT/i) != -1) { // Spec ..._PLAIN does not have an arrow
		var iconLineColor = attr.style["com.yworks.bpmn.icon.line.color"];
		
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
			var iconFill1 = attr.style["com.yworks.bpmn.icon.fill"];
			var iconFill2 = attr.style["com.yworks.bpmn.icon.fill2"];
			ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_icon_gradient", x2:1, y2:1, width:w, height:h, color1:iconFill1, color2:iconFill2});
			style.fill = ret.color;
		}
		else
			style.fill = iconLineColor;
		style.stroke = iconLineColor;
		style["stroke-width"] = 1;
		svg.appendChild(path);
	}
	
	if(collection == "BPMN_MARKER_PARALLEL") { // These three bars mark the data object as a collection
		var barw = 4;
		var barh = 15.5;
		var barx = w/2 - 7.5
		var bary = h - 1 - barh;
		var rect = null, style = null;
		
		for(var i = 0; i < 3; i++, barx += 5.5) {
			rect = document.createElementNS(svgns, "rect");
			rect.setAttributeNS(null, "x", barx);
			rect.setAttributeNS(null, "y", bary);
			rect.setAttributeNS(null, "width", barw);
			rect.setAttributeNS(null, "height", barh);
			style = rect.style;
			style.fill = "black";
			svg.appendChild(rect);
		}
	}
}

/**
 * Draw a business process model message for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactMessage = function(svg, type, attr) {
	var x = attr.x || 1;
	var y = attr.y || 1;
	var w = attr.width, w2 = w/2;
	var h = attr.height, h2 = h/2;
	var svgns = "http://www.w3.org/2000/svg";
	var borderColor = attr.borderColor;
	var detailColor = attr.detailColor || borderColor;
	var borderWidth = attr.borderWidth || 1;
	var strokeDash = yWorks.createSVGLinePattern(attr.borderStyle, borderWidth);
	
	// Envelope outline
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "x", x);
	rect.setAttributeNS(null, "y", y);
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	var color1 = attr.bgColor;
	var color2 = attr.color2;
	if(type.search("REPLY") != -1) { // Tint the background color darker
		if(color1) {
			var ret = yWorks.colorAndOpacity(color1);
			color1 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
			color1 = yWorks.colorAndOpacity(color1, ret.opacity).color;
		}
		if(color2){
			var ret = yWorks.colorAndOpacity(color2);
			color2 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
			color2 = yWorks.colorAndOpacity(color2, ret.opacity).color;
		}
	}
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2});
	style.fill = ret.color;
	style.stroke = borderColor;
	style["stroke-width"] = borderWidth;
	style["stroke-dasharray"] = strokeDash;
	svg.appendChild(rect);
	
	// Envelope fold
	var path = document.createElementNS(svgns, "path"), d = "";
	d += "M "+(x)+" "+(y);
	d += " L "+(x+w2)+" "+(y+h2);
	d += " L "+(x+w)+" "+(y);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", strokeDash);
	style = path.style;
	style.fill = "none";
	style.stroke = detailColor;
	style["stroke-width"] = borderWidth;
	style["stroke-dasharray"] = strokeDash;
	svg.appendChild(path);
}

/**
 * Draw a business process model data store for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createDataStore = function(svg, type, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var w2 = w/2;
	var h8 = h/8, h82 = h8/2, h78 = 7*h8;
	var borderWidth = attr.borderWidth, borderColor = attr.borderColor;
	var strokeDash = yWorks.createSVGLinePattern(attr.borderStyle, borderWidth);
	
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M 1 "+(h8-1);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(w)+" "+(h8-1);
	d += " L "+(w)+" "+(h78);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(1)+" "+(h78);
	d += " L 1 "+(h8-1)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", strokeDash);
	var style = path.style;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+"_gradient", x2:1, y2:1, width:w, height:h, color1:attr.bgColor, color2:attr.color2});
	style.fill = ret.color;
	style["stroke-width"] = borderWidth;
	style.stroke = borderColor;
	svg.appendChild(path);
	
	// Rim, and strip around upper rim
	path = document.createElementNS(svgns, "path");
	d = "";
	var x = 0, y = h8;
	for(var i = 0, j = 3; i < j; i++, y += h82) {
		d += "M 1 "+y;
		d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(0)+" "+(w)+" "+(y);
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", strokeDash);
	style = path.style;
	style["stroke-width"] = borderWidth;
	style.stroke = borderColor;
	style.fill = "none";
	svg.appendChild(path);
}

/**
 * Draw a plate shape for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createPlate = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var c = 10;
	var bgColor = attr.bgColor;
	
	if(attr.style && "ModernNodeRadius" in attr.style)
		c = attr.style.ModernNodeRadius;
	else if(configuration == "ShinyPlateNode" || configuration == "ShinyPlateNodeWithShadow")
		c = 3;
	c /= 2; // Corner scaling is too severe when applied straight-up
	
	// Body
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = bgColor;
	style.stroke = attr.borderColor;
	svg.appendChild(rect);
	
	// Shine
	var shine = null;
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
	style["stroke-width"] = 1;
	var color1 = yWorks.shadeBlendConvert(0.45, attr.color2 || bgColor, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.65, color1, bgColor);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"_gradient", width:attr.width, height:attr.height, x2:x2, y2:1,
			stops:[{offset:0.0, color:"#FFFFFF", opacity:1.0}, {offset:0.35, color:color1, opacity:1.0}, {offset:0.55, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = "none";
	svg.appendChild(shine);
}

/**
 * Draw a beveled plate shape for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createBevel = function(svg, configuration, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	var w = attr.width;
	var h = attr.height;
	var c = 10;
	var bgColor = attr.bgColor;
	
	if(attr.style && "ModernNodeRadius" in attr.style)
		c = attr.style.ModernNodeRadius;
	else if(configuration == "BevelNode" || configuration == "BevelNodeWithShadow")
		c = 3;
	c /= 2; // Corner scaling is too severe when applied straight-up
	
	// Base
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	style.fill = bgColor;
	style.stroke = attr.borderColor;
	svg.appendChild(rect);
	
	// Top
	rect = document.createElementNS(svgns, "rect");
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h/2);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = attr.borderWidth;
	var color1 = yWorks.shadeBlendConvert(0.75, attr.color2 || bgColor, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.5, color1, bgColor);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"_gradient", width:attr.width, height:attr.height, x2:0, y2:1,
			stops:[{offset:0.0, color:color1, opacity:1.0}, {offset:0.75, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = attr.borderColor;
	svg.appendChild(rect);
	
	// Major outline
	rect = document.createElementNS(svgns, "rect");
	rect.setAttributeNS(null, "x", 2);
	rect.setAttributeNS(null, "y", 2);
	rect.setAttributeNS(null, "width", (w-4));
	rect.setAttributeNS(null, "height", (h-4));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = 2;
	style.fill = "none";
	style.stroke = yWorks.shadeBlendConvert(0.15, attr.color2 || bgColor, "#000000");
	svg.appendChild(rect);
	
	// Outer outline
	rect = document.createElementNS(svgns, "rect");
	rect.setAttributeNS(null, "x", 1);
	rect.setAttributeNS(null, "y", 1);
	rect.setAttributeNS(null, "width", (w-2));
	rect.setAttributeNS(null, "height", (h-2));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = "white";
	svg.appendChild(rect);
	
	// Inner outline
	rect = document.createElementNS(svgns, "rect");
	rect.setAttributeNS(null, "x", 3);
	rect.setAttributeNS(null, "y", 3);
	rect.setAttributeNS(null, "width", (w-6));
	rect.setAttributeNS(null, "height", (h-6));
	rect.setAttributeNS(null, "rx", Math.min(c-2, c));
	rect.setAttributeNS(null, "ry", Math.min(c-2, c));
	style = rect.style;
	style.left = "1px";
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = "white";
	svg.appendChild(rect);
}


/**
 * The representation of a special element with a visual component that is stored as SVG data.
 * They appears to comprise a group of computer-related items.
 * @override
 * @property {String} refid - an associative id that refers to the SVG data to create the element
 * @property {SVG} ref - when the SVG data is allocated to the appropriate element (this one), it is stored here
 */
SVGNode.prototype = new Representation();
SVGNode.prototype.constructor = SVGNode;
function SVGNode(id, attributes) {
	this.refid = null;
	this.ref = null;
	Representation.call(this, id,attributes);
}

/**
 * Get the resource identifier.
 * @returns {String} the identifier corresponding to a resource entry from the original graphml data
 */
SVGNode.prototype.getRefid = function() {
	return this.refid;
}

/**
 * Set the resource identifier.
 * @param {String} id - the identifier that should correspond to a resource entry in the original graphml data
 * @returns {Boolean} always returns true
 */
SVGNode.prototype.setRefid = function(id) {
	this.refid = id;
	return true;
}

/**
 * Get the resource.
 * @returns {SVG} the corresponding resource entry from the original graphml data
 */
SVGNode.prototype.getRef = function() {
	return this.ref;
}

/**
 * Set the resource.
 * @param {SVG} ref - the corresponding resource entry from the original graphml data
 * @returns {Boolean} always returns true
 */
SVGNode.prototype.setRef = function(ref) {
	this.ref = ref;
	return true;
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
SVGNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getBasicGeometry(attributes, xml);
	
	var g = xml.getElementsByTagName("y:SVGModel")[0];
	g = g && g.getElementsByTagName("y:SVGContent")[0];
	this.refid = g && g.getAttribute("refid");
	
	return attributes;
}

/**
 * Create an HTML component to represent this SVG element.
 * @override
 */
SVGNode.prototype.createElement = function(attr) {
	var cattr = attr || this.data || {};
	var bgx = cattr.x, bgy = cattr.y, bgw = cattr.width, bgh = cattr.height;
	
	// svg frame
	var containerNode = Representation.prototype.createElement.call(this, attr);
	var contentNode = null, style = null;
	containerNode.className = "yWorks svg frame";
	style = containerNode.style;
	style.left = bgx+"px";
	style.top = bgy+"px";
	style.width = bgw+"px";
	style.height = bgh+"px";
	
	var svg = this.reconstructSVGResourceData(cattr);
	containerNode.appendChild(svg);
	return containerNode;
}

/**
 * Re-parse the DOM structure associated with the particular resource of this SVGNode element to compose an image.
 * Rather than the exhaustive constructors of the GenericNode elements, SVGNodes have their SVG included at the end of the markup source source.
 * The setup routines for this namespac extract and pair the data with the element.
 * @param {Object} attr - an optional reference that would contain data important to the reconstruction of the svg element
 * @returns {SVGElement} an element that reconstructs the svg element
 */
SVGNode.prototype.reconstructSVGResourceData = function(attr) {
	/*
	The basic svg-type data for this namespace's file type stored at the end of the main graphml file.
	It is filled with its own foreign namespace data, for example, inkscape and sodipodi.
	Fortunately, the DOMParser can transform most of the important data into a proper tree structure that can be explored.
	*/
	var svgns = "http://www.w3.org/2000/svg";
	var cattr = attr || this.data || {};
	var svg = document.createElementNS(svgns, "svg"); // Placeholder
	svg.setAttributeNS(null, "width", cattr.width);
	svg.setAttributeNS(null, "height", cattr.height);
	
	var id = this.id, resource = this.ref, resourceDOM = null;
	if(!resource) {
		console.log("Element "+id+": missing resource '"+this.refid+"'");
		return svg;
	}
	try {
		resourceDOM  = new DOMParser().parseFromString(resource, "text/xml");
	}
	catch(err) {
		console.log("Element "+id+": could not parse resource string '"+this.refid+"' into a DOM structure - "+err.message);
		return svg;
	}
	var header = resourceDOM.getElementsByTagName("svg")[0];
	if(!header) {
		console.log("Element "+id+": can not find (root of) vector graph data in parsed DOM structure");
		return svg;
	}
	
	header.parentNode.removeChild(header);
	svg = header;
	SVGNode.propagateUniqueID(svg, id);
	
	// TODO - The code below would be useful for a more gradual element testing methodology.  For now, rely on reference swapping.
/*	var namespaces = { // Defaults
		"xml":"http://www.w3.org/XML/1998/namespace",
		"xmlns":"http://www.w3.org/2000/xmlns/"
	};
	for(var i = 0, attributes = header.attributes, j = attributes.length; i < j; i++) { // Copy the attributes from the root SVG element
		var attribute = attributes[i];
		var nodeName = attribute.nodeName;
		var nodeValue = attribute.nodeValue;
		var ns = null;
		if(nodeName.search(":") != -1) { // Reference/update recognized local namespaces for attribute imports
			var nspace = nodeName.split(":");
			if(nspace[0] == "xmlns")
				namespaces[nspace[1]] = nodeValue;
			ns = namespaces[nspace[0]];
			if(!ns) {
				console.log("Element "+id+": stopped an unknown namespace from setting data - "+nodeName+"="+nodeValue);
				continue;
			}
		}
		else if(nodeName == "xmlns") // This is also a special case
			continue;
		try {
			svg.setAttributeNS(ns, nodeName, nodeValue);
		}
		catch(err) {
			console.log("Element "+id+": caught a namespace violation - "+nodeName+"="+nodeValue);
		}
	}
	
	OuterLoop:
	while(header.firstChild) {
		var elem;
		try {
			while(header.firstChild) {
				elem = header.firstChild;
				svg.appendChild(elem);
				elem = null;
			}
			break OuterLoop; // We're done.
		}
		catch(err) {
			var nodeName = elem ? (elem.tagName && elem.tagName.toLowerCase()) || (elem.nodeName && elem.nodeName.toLowerCase()) : "node";
			console.log("Element "+id+": failed when working with a "+nodeName+" ("+err.message+")");
			if(elem && elem.parentNode == header)
				elem.parentNode.removeChild(elem); // Do not revisit the node that caused this issue
			elem = null;
		}
	}*/
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
 * The representation of an edge, or line segments that connect different nodes.
 * yWorks edges can have multiple corners and decorated endpoints.
 * They also have complex curves (not currently supported).
 * @override
 */
PolyLineEdge.prototype = new Representation();
PolyLineEdge.prototype.constructor = PolyLineEdge;
function PolyLineEdge(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
PolyLineEdge.prototype.readXML = function(xml) {
	var attributes = {};
	var source = {};
	source.id = attributes.source;
	attributes.source = source;
	var target = {};
	source.id = attributes.target;
	attributes.target = target;
	
	attributes.id = xml.getAttribute("id");
	source.id = xml.getAttribute("source");
	target.id = xml.getAttribute("target");
	var g;
	g = xml.getElementsByTagName("y:Path")[0];
	source.dx = +g.getAttribute("sx");
	source.dy = +g.getAttribute("sy");
	target.dx = +g.getAttribute("tx");
	target.dy = +g.getAttribute("ty");
	g = xml.getElementsByTagName("y:Point");
	// We may have a number of intermediate points
	var px = attributes.px = [];
	var py = attributes.py = [];
	for(var i = 0, j = g.length; i < j; i++) {
		var point = g[i];
		px.push(+point.getAttribute("x"));
		py.push(+point.getAttribute("y"));
	}
	
	g = xml.getElementsByTagName("y:LineStyle")[0];
	attributes.stroke = g.getAttribute("color");
	attributes.type = g.getAttribute("type");
	attributes.strokeWidth = g.getAttribute("width");
	g = xml.getElementsByTagName("y:Arrows")[0];
	source.arrow = g.getAttribute("source");
	target.arrow = g.getAttribute("target");
	g = xml.getElementsByTagName("y:BendStyle")[0];
	attributes.smoothed = g.getAttribute("smoothed") == "true";
	
	return attributes;
}

/**
 * Create an HTML component to represent this edge.
 * @override
 */
PolyLineEdge.prototype.createElement = function(attr) {
	attr = attr || this.data;
	var source = attr.source;
	var target = attr.target;
	if(!attr || !source || !target)
		throw new Error("An unknown edge was trying to be drawn.");
	var stroke = attr.stroke;
	var strokeWidth = +attr.strokeWidth;
	var svgns = "http://www.w3.org/2000/svg";
	
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks line"
	
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = attr.id+"-shape";
	contentNode.class = "yWorks line frame";
	style = contentNode.style;
//	style.left = attr.x+"px";
//	style.top = attr.y+"px";
	style.width = attr.width+"px";
	style.height = attr.height+"px";
	containerNode.appendChild(contentNode);
	
	var svg = document.createElementNS(svgns, "svg");
	svg.setAttributeNS(null, "width", +attr.width + 13); // Add extra to make certain the line is properly enclosed
	svg.setAttributeNS(null, "height", +attr.height + 13);
	contentNode.appendChild(svg);
	
	var dList = yWorks.createSVGLinePattern(attr.type);
	var style = {fill:"none", stroke:stroke};
	style["stroke-width"] = strokeWidth;
	PolyLineEdge.chainedLine(svg, attr, style, dList);
	//PolyLineEdge.pathLine(svg, attr, style, dList);
	
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
PolyLineEdge.chainedLine = function(svg, attr, dstyle, dashed) {
	var svgns = "http://www.w3.org/2000/svg";
	var source = attr.source, target = attr.target;
	var px = attr.px, py = attr.py;
	var ax = source.x, ay = source.y, bx, by;
	var line, style;
	if(px.length) {
		for(var i = 0, j = px.length; i < j; i++) {
			bx = px[i];
			by = py[i];
			line = document.createElementNS(svgns, "line");
			line.setAttributeNS(null, "x1", ax);
			line.setAttributeNS(null, "y1", ay);
			line.setAttributeNS(null, "x2", bx);
			line.setAttributeNS(null, "y2", by);
			style = line.style;
			style.fill = dstyle.fill;
			style.stroke = dstyle.stroke;
			style["stroke-width"] = dstyle["stroke-width"];
			if(dashed)
				line.setAttributeNS(null, "stroke-dasharray", dashed);
			svg.appendChild(line);
			ax = bx;
			ay = by;
		}
	}
	line = document.createElementNS(svgns, "line");
	line.setAttributeNS(null, "x1", ax);
	line.setAttributeNS(null, "y1", ay);
	line.setAttributeNS(null, "x2", target.x);
	line.setAttributeNS(null, "y2", target.y);
	style = line.style;
	style.fill = dstyle.fill;
	style.stroke = dstyle.stroke;
	style["stroke-width"] = dstyle["stroke-width"];
	if(dashed)
		line.setAttributeNS(null, "stroke-dasharray", dashed);
	svg.appendChild(line);
}

/**
 * Construct this edge out of a single SVG path element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {Object} attr - information pertinent to the entirety of the edge
 * @param {Object} dtyle - information pertinent to this edge's css
 * @param {String} dashed - the formatted string that explains how the line is stylized, if at all
 */
PolyLineEdge.pathLine = function(svg, attr, dstyle, dashed) {
	var source = attr.source, target = attr.target;
	var sList = "", xList = attr.px, yList = attr.py, len = xList.length;
	
	var polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
	sList += source.x +" "+ source.y +" ";
	for(var i = 0; i < len; i++) {
		sList += xList[i] +","+ yList[i] +" ";
	}
	sList += target.x +" "+ target.y +" ";
	polyline.setAttributeNS(null, "points", sList);
	var style = polyline.style;
	style.fill = dstyle.fill;
	style.stroke = dstyle.stroke;
	style["stroke-width"] = dstyle["stroke-width"];
	if(dashed)
		polyline.setAttributeNS(null, "stroke-dasharray", dashed);
	svg.appendChild(polyline);
}

/**
 * Construct and orient any potential stylized endpoints for this edge.
 * All endpoints are drawn facing rightwards and then must be rotated around the tip to align with the line segment to which they coincide.
 * @private
 * @static
 * @param {String} side - either "source" or "target," indicating one end of the edge or the other
 * @param {Object} attributes - information pertinent to the entirety of the edge
 */
PolyLineEdge.arrowHead = function(svg, side, attributes) {
	var svgid = attributes.id+"-"+side+"-arrow";
	var px = attributes.px, py = attributes.py;
	var anglex, angleY, angle = 0;
	var sideAttr = attributes[side];
	var arrowType = "none";
	
	// Which side?
	if(side == "source") {
		angleX = sideAttr.x - (px[0] || attributes.target.x);
		angleY = sideAttr.y - (py[0] || attributes.target.y);
	}
	else if(side == "target") {
		var len1 = px.length-1;
		angleX = sideAttr.x - (px[len1] || attributes.source.x);
		angleY = sideAttr.y - (py[len1] || attributes.source.y);
	}
	else
		return;
	arrowType = sideAttr.arrow || arrowType; // What the arrow type
	if(arrowType == "none")
		return;
	// Calculate the rotation transform
	if(angleY == 0)
		angle = angleX > 0 ? 0 : 180;
	else if(angleX == 0)
		angle = angleY > 0 ? 90 : -90;
	else {
		angle = Math.atan(angleY/angleX) * (180 / Math.PI);
		if(angleX < 0)
			angle += 180;
	}
	var left = sideAttr.x;
	var top = sideAttr.y;
	
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= 15;
	top -= 5;
	
	var pathList = "M "+(left)+" "+(top);
	pathList += " L "+(left+15)+" "+(top+5);
	pathList += " L "+(left)+" "+(top+10);
	pathList += " L "+(left)+" "+(top);
	pathList += " Z";
	path.setAttributeNS(null, "d", pathList);
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= 13;
	
	var pathList = "M "+(left)+" "+(top);
	pathList += " L "+(left+6)+" "+(top-4);
	pathList += " L "+(left+13)+" "+(top);
	pathList += " L "+(left+6)+" "+(top+4);
	pathList += " L "+(left)+" "+(top);
	pathList += " Z";
	path.setAttributeNS(null, "d", pathList);
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= 12;
	top -= 6;
	
	var flex = attr.arrowType == "concave" ? [2,4,4,8] : [4,-2,8,12];
	var pathList = "M "+(left)+" "+(top);
	pathList += " Q "+(left+flex[0])+" "+(top+flex[1])+" "+(left+12)+" "+(top+6);
	pathList += " M "+(left)+" "+(top+12);
	pathList += " Q "+(left+flex[2])+" "+(top+flex[3])+" "+(left+12)+" "+(top+6);
	if(attr.arrowType == "concave") {
		pathList += " M "+(left+11)+" "+top;
		pathList += " L "+(left+11)+" "+(top+12);
	}
	path.setAttributeNS(null, "d", pathList);
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= attr.arrowType.search("dash") > -1 ? 13 : 3;
	top -= 7;
	
	var vary = attr.arrowType == "skewed_dash" ? 3 : 0;
	var pathList = "M "+(left-vary)+" "+(top);
	pathList += " L "+(left+vary)+" "+(top+14);
	path.setAttributeNS(null, "d", pathList);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	var horOffset = attr.arrowType == "short" ? 7 : 11;
	left -= horOffset;
	top -= 5;
	
	var pathList = "M "+(left)+" "+(top);
	pathList += " L "+(left+horOffset)+" "+(top+5);
	pathList += " L "+(left)+" "+(top+10);
	pathList += " L "+(left+4)+" "+(top+5);
	pathList += " L "+(left)+" "+(top);
	pathList += " Z";
	path.setAttributeNS(null, "d", pathList);
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= 13;
	top -= 5;
	
	var pathList = "M "+(left)+" "+(top);
	pathList += " L "+(left+13)+" "+(top+5);
	pathList += " L "+(left)+" "+(top+10);
	path.setAttributeNS(null, "d", pathList);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	path.id = id;
	left -= 7;
	top -= 8;
	
	var pathList = "M "+(left)+" "+(top);
	pathList += " L "+(left)+" "+(top+16);
	path.setAttributeNS(null, "d", pathList);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
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
	left -= 14;
	
	var pathList = "M "+(left+5)+" "+(top);
	pathList += " L "+(left+14)+" "+(top-8);
	pathList += " M "+(left+5)+" "+(top);
	pathList += " L "+(left+14)+" "+(top+8);
	path.setAttributeNS(null, "d", pathList);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	path.id = id;
	path.setAttributeNS(null, "cx", left-15);
	path.setAttributeNS(null, "cy", top);
	path.setAttributeNS(null, "r", 5);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
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
	var path = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	path.id = id;
	left -= 14;
	
	var pathList = "M "+(left)+" "+(top-8);
	pathList += " L "+(left)+" "+(top+8);
	path.setAttributeNS(null, "d", pathList);
	path.setAttributeNS(null, "transform", attr.transform);
	
	style = path.style;
	style["stroke-width"] = 1;
	style.fill = "none";
	style.stroke = attr.stroke;
	
	svg.appendChild(path);
}