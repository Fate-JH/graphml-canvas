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
	var group = attr.groups[attr.realizers.active];
	var obj = {};
	if(!group) { // TODO: unwarranted failsafe
		obj = yWorksRepresentation.prototype.getBounds();
	}
	else {
		var geometry = group.geometry;
		obj.x = geometry.x;
		obj.y = geometry.y;
		obj.width = geometry.width;
		obj.height = geometry.height;
	}
	return obj;
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @override
 */
ProxyAutoBoundsNode.prototype.setBounds = function(bounds) {
	var attr = this.data;
	var group = attr.groups[attr.realizers.active];
	var geometry = group.geometry;
	if("x" in bounds)
		geometry.x = bounds.x;
	if("y" in bounds)
		geometry.y = bounds.y;
	if("width" in bounds)
		geometry.width = bounds.width;
	if("height" in bounds)
		geometry.height = bounds.height;
}

/**
 *
 */
ProxyAutoBoundsNode.prototype.shift = function(dx, dy) {
	dx = dx || 0;
	dy = dy || 0;
	
	var attr = this.data;
	var group = attr.groups[attr.realizers.active];
	var geometry = group.geometry;
	geometry.x += dx;
	geometry.y += dy;
	
	var labels = group.nodeLabels || [];
	for(var i = 0, j = labels.length; i < j; i++) {
		labels[i].x += dx;
		labels[i].y += dy;
	}
}

/**
 * na
 */
ProxyAutoBoundsNode.getInsets = function(attributes, xml) {
	attributes.left = +xml.getAttribute("left");
	attributes.leftF = +xml.getAttribute("leftF");
	attributes.right = +xml.getAttribute("right");
	attributes.rightF = +xml.getAttribute("rightF");
	attributes.top = xml.getAttribute("top");
	attributes.topF = +xml.getAttribute("topF");
	attributes.bottom = xml.getAttribute("bottom");
	attributes.bottomF = +xml.getAttribute("bottomF");
}

/**
 * na
 */
ProxyAutoBoundsNode.getStateAndInsets = function(attributes, xml) {
	var field = (attributes.state = {}), test = null;
	var yuri = yWorks.getNamespaceURI();
	
	var section = xml.getElementsByTagNameNS(yuri, "State")[0];
	field.closed = section.getAttribute("closed") == "true";
	field.closedHeight = +section.getAttribute("closedHeight");
	field.closedWidth = +section.getAttribute("closedWidth");
	if(test = section.getAttribute("innerGraphDisplayEnabled"))
		field.innerGraphDisplayEnabled = test == "true";
	if(test = section.getAttribute("autoResize"))
		field.autoResize = test == "true";
	
	ProxyAutoBoundsNode.getInsets((attributes.insets = {}), xml.getElementsByTagNameNS(yuri, "Insets")[0]);
	ProxyAutoBoundsNode.getInsets((attributes.borderInsets = {}), xml.getElementsByTagNameNS(yuri, "BorderInsets")[0]);
}

/**
 * na
 */
ProxyAutoBoundsNode.prototype.readXML = function(xml) {
	var attributes = {};

	var id = attributes.id = this.id;
	attributes["foldertype"] = xml.getAttribute("yfiles.foldertype");
	
	var g;
	var yuri = yWorks.getNamespaceURI();
	g = xml.getElementsByTagNameNS(yuri, "Realizers")[0];
	attributes.realizers = {};
	attributes.realizers.active = +g.getAttribute("active");
	
	// GroupNodes
	var groups = attributes.groups = [], gElems = null;
	gElems = g.getElementsByTagNameNS(yuri, "GroupNode");
	for(var i = 0, j = gElems.length; i < j; i++) {
		var group = {};
		var gi = gElems[i];
		group.id = id+"-"+i;
		group.configuration = gi.getAttribute("configuration");
		yWorks.getCommonFields(group, gi);
		yWorks.getLabels(group, gi);
		ProxyAutoBoundsNode.getStateAndInsets(group, gi);
		var section = gi.getElementsByTagNameNS(yuri, "Shape")[0], field = null;
		group.shape = {};
		group.shape.type = section.getAttribute("type");
		groups.push(group);
	}
	if(groups.length) {
		attributes.nodeType = "GroupNodes";
		return attributes;
	}
	
	// GenericGroupNodes
	gElems = g.getElementsByTagNameNS(yuri, "GenericGroupNode");
	for(var i = 0, j = gElems.length; i < j; i++) {
		var group = {};
		var gi = gElems[i];
		group.id = id+"-"+i;
		group.configuration = gi.getAttribute("configuration");
		yWorks.getCommonFields(group, gi);
		yWorks.getStyleProperties(group, gi);
		yWorks.getLabels(group, gi);
		ProxyAutoBoundsNode.getStateAndInsets(group, gi);
		groups.push(group);
	}
	attributes.nodeType = "GenericGroupNodes";
	return attributes;
}

/**
 * Create an HTML component to represent this proxy auto-bound node.
 * @override
 */
ProxyAutoBoundsNode.prototype.createElement = function(attr) {
	attr = attr || this.data;
	
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks proxy";
	
	var contentNode = null, groupNode = null, style = null;
	var groups = attr.groups;
	var active = attr.realizers.active;
	for(var i = 0, j = groups.length; i < j; i++) {
		var group = groups[i];
		groupNode = document.createElement("div");
		var id = groupNode.id = group.id;
		groupNode.className = "yWorks proxy child";
		if(attr.nodeType == "GroupNodes") {
			var geometry = group.geometry;
			var fill = group.fill;
			var borderStyle = group.borderStyle;
			
			contentNode = document.createElement("div"), style = null;
			contentNode.id = id+"-shape";
			contentNode.className = "yWorks proxy shape";
			style = contentNode.style;
			style.left = geometry.x+"px";
			style.top = geometry.y+"px";
			style.width = geometry.width+"px";
			style.height = geometry.height+"px";
			
			contentNode.appendChild( ShapeNode.switchShape(group.shape.type, {id:id+"-background", geometry:geometry, borderStyle:{borderStyle:"none"}, fill:fill}) );
			var svg = ShapeNode.switchShape(group.shape.type, {id:id+"-outline", geometry:geometry, borderStyle:borderStyle});
			svg.style.position = "absolute";
			svg.style.left = "0px";
			contentNode.appendChild(svg);
			
			/* var svgns = "http://www.w3.org/2000/svg";
			var svg = document.createElementNS(svgns, "svg");
			svg.setAttributeNS(null, "width", 20);
			svg.setAttributeNS(null, "height", 20);
			style = svg.style;
			style.position = "absolute";
			style.left = "0px";
			var stateBox = document.createElementNS(svgns, "rect");
			stateBox.setAttributeNS(null, "x", 4);
			stateBox.setAttributeNS(null, "y", 4);
			stateBox.setAttributeNS(null, "width", 15);
			stateBox.setAttributeNS(null, "height", 15);
			style = stateBox.style;
			style.fill = "#d3d3d3";
			style.stroke = "#1a1a1a";
			style["stroke-width"] = 0.5;
			svg.appendChild(stateBox);
			groupNode.appendChild(svg); */
		}
		else {
			var geometry = group.geometry;
			contentNode = document.createElement("div"), style = null;
			contentNode.id = id+"-shape";
			contentNode.className = "yWorks proxy shape";
			style = contentNode.style;
			style.left = geometry.x+"px";
			style.top = geometry.y+"px";
			style.width = geometry.width+"px";
			style.height = geometry.height+"px";
			
			var activity = GenericNode.switchConfiguration(group.configuration, group);
			contentNode.appendChild(activity);
		}
		groupNode.appendChild(contentNode);
		yWorks.createLabels(group, groupNode);
		containerNode.appendChild(groupNode);
		if(i != active)
			groupNode.style.visibility = "hidden";
	}
	return containerNode;
}