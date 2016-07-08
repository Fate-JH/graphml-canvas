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
	
	var yuri = yWorks.getNamespaceURI();
	var g = xml.getElementsByTagNameNS(yuri, "SVGModel")[0];
	attributes.svgBoundsPolicy = g.getAttribute("svgBoundsPolicy");
	
	g = g && g.getElementsByTagNameNS(yuri, "SVGContent")[0];
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