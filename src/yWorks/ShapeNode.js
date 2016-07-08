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
	
	var yuri = yWorks.getNamespaceURI();
	attributes.shape = {};
	var g = xml.getElementsByTagNameNS(yuri, "Shape")[0];
	attributes.shape.type = g.getAttribute("type");
	
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
	contentNode.appendChild( ShapeNode.switchShape(attr.shape.type, attr) );
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var borderColor = borderStyle.borderColor;
	var borderWidth = borderStyle.borderWidth;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderWidth);
	
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
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = color;
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
		polyline.setAttributeNS(null, "stroke-dasharray", dashed);
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
		polyline.setAttributeNS(null, "stroke-dasharray", dashed);
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var w10 = w/10;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w10)+" 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-w10)+" "+(h);
	d += " L 0 "+(h)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w10 = w/10;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
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
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h);
	d += " L 0 "+(h);
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w4 = w/4;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(shape.search("2") == -1) {
		d += "M "+(w4)+" 0";
		d += " L "+(w - w4)+" 0";
		d += " L "+(w)+" "+(h);
		d += " L 0 "+(h);
		d += " L "+(w4)+" 0 Z";
	}
	else {
		d += "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w - w4)+" "+(h);
		d += " L "+(w4)+" "+(h);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w3 = w/3, w23 = 2*w3;
	var h = geometry.height, h3 = h/3, h23 = 2*h3;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
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
	style.fill = color;
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
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var ret = yWorks.setupLinearGradient(svg, {id:attr.id+'-gradient', width:w, height:h, color1:fill.color, color2:fill.color2});
	
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
	style.fill = ret.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}