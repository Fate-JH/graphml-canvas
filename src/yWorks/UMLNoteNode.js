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
	var borderStyle = attr.borderStyle;
	
	var x = geometry.x;
	var y = geometry.y;
	var w = geometry.width;
	var h = geometry.height;
	
	var borderColor = borderStyle.borderColor;
	var lineStyle = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
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