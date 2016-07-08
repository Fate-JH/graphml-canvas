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
 *
 */
PolyLineEdge.prototype.shift = function(dx, dy) {
	dx = dx || 0;
	dy = dy || 0;
	
	var attr = this.data;
	var points = attr.points;
	for(var i = 0, j = points.length; i < j; i++) {
		points[i].x += dx;
		points[i].y += dy;
	}
	
	// Move over clipped end coordinates, if they exist
	var endpoints = attr.endpoints;
	if(endpoints) {
		endpoints.source.x += dx;
		endpoints.source.y += dy;
		endpoints.target.x += dx;
		endpoints.target.y += dy;
	}
	
	var labels = attr.nodeLabels || [];
	for(var i = 0, j = labels.length; i < j; i++) {
		labels[i].x += dx;
		labels[i].y += dy;
	}
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
	var yuri = yWorks.getNamespaceURI();
	g = xml.getElementsByTagNameNS(yuri, "Path")[0];
	field = attributes.path = {};
	field.sx = +g.getAttribute("sx");
	field.sy = +g.getAttribute("sy");
	field.tx = +g.getAttribute("tx");
	field.ty = +g.getAttribute("ty");
	
	g = xml.getElementsByTagNameNS(yuri, "Point"); // We may have a number of intermediate points
	field = attributes.points = [];
	for(var i = 0, j = g.length; i < j; i++) {
		var point = g[i];
		field.push(
			{x:+point.getAttribute("x"),
			 y:+point.getAttribute("y")}
		);
	}
	
	g = xml.getElementsByTagNameNS(yuri, "LineStyle")[0];
	field = attributes.lineStyle = {};
	field.color = g.getAttribute("color");
	field.type = g.getAttribute("type");
	field.width = g.getAttribute("width");
	
	g = xml.getElementsByTagNameNS(yuri, "Arrows")[0];
	field = attributes.arrows = {};
	field.source = g.getAttribute("source");
	field.target = g.getAttribute("target");
	
	g = xml.getElementsByTagNameNS(yuri, "BendStyle")[0];
	field = attributes.bendStyle = {};
	field.smoothed = g.getAttribute("smoothed") == "true";
	
	yWorks.getLabels(attributes, xml);
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
	
	var svgid = attributes.id+"-"+side+"-arrow";
	var attr = {};
	attr.stroke = attributes.lineStyle.color;
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