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
	var yuri = yWorks.getNamespaceURI();
	g = xml.getElementsByTagNameNS(yuri, "UML")[0];
	attributes.uml = {};
	attributes.uml.clipContent = attributes.clipContent = g.getAttribute("clipContent") == "true";
	attributes.uml.use3DEffect = attributes.use3DEffect = g.getAttribute("use3DEffect") == "true";
	attributes.uml.omitDetails = attributes.omitDetails = g.getAttribute("omitDetails") == "true";
	attributes.uml.stereotype = attributes.stereotype = g.getAttribute("stereotype");
	attributes.uml.constraint = attributes.constraint = g.getAttribute("constraint");
	
	g = xml.getElementsByTagNameNS(yuri, "AttributeLabel")[0].firstChild;
	attributes.uml.properties = attributes.properties = (g ? g.textContent : null);
	
	g = xml.getElementsByTagNameNS(yuri, "MethodLabel")[0].firstChild;
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
	var borderStyle = attr.borderStyle;
	var uml = attr.uml;
	
	var gwidth = geometry.width+"px";
	var omitDetails = uml.omitDetails;
	var properties = uml.properties;
	var methods = uml.methods;
	var fields = properties || methods;
	
	var borderColor = borderStyle.borderColor;
	var borderLine = borderStyle.borderStyle; // Attribute border-style needs better parsing for CSS
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
	style["border-width"] = borderStyle.borderWidth+"px";
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
	var note = attr.nodeLabels[0] || {content:"Class", fontColor:"#000000", fontSize:10};
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