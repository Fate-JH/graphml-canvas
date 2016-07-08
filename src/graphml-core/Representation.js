/**
 * The base class that represents the pure graphml container of a graph element.
 * As an abstraction this class serves as the visual component for the element.
 * This class should not need to be extended or modified unless the graphml schema changes.
 * @property {String} id - a unique identifier for this element
 * @property {Object} data - information that helps construct the visual component of the Representation
 * @abstract
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function
 * @param {Object} attributes.xml - na
 */
function Representation(id, attributes) {
	attributes = attributes || {};
	this.id = id;
	this.data = null;
	
	if(attributes.xml)
		this.data = this.readXML(attributes.xml);
}

/**
 * Get the additional data that was included when the graphml element was created.
 * @returns {Object} the additional data
 */
Representation.prototype.getAttributes = function() {
	return this.data || {};
}

/**
 * Provide new additional data after the element exists.
 * @param {Object} attributes - the additional data
 * @returns {Boolean} always returns true
 */
Representation.prototype.setAttributes = function(attributes) {
	if(attributes && attributes.xml)
		this.data = this.readXML(attributes.xml);
	return true;
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @returns {Object} o - an object that contains the coordinates and span
 * @returns {Number} o.x - the x-coordinate of the element's top-left corner ("left" in HTML)
 * @returns {Number} o.y - the y-coordinate of the element's top-left corner ("top" in HTML)
 * @returns {Number} o.width - the span called width
 * @returns {Number} o.height - the span called height
 */
Representation.prototype.getBounds = function() {
	return { x:0, y:0, width:0, height:0 };
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @param {Object} bounds - an object that contains the coordinates and span
 * @param {Number} bounds.x - the x-coordinate of the element ("left" in HTML)
 * @param {Number} bounds.y - the y-coordinate of the element ("top" in HTML)
 * @param {Number} bounds.width - the span called width
 * @param {Number} bounds.height - the span called height
 * @returns {Boolean} always returns false
 */
Representation.prototype.setBounds = function(bounds) {
	return false;
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @param {XML} xml - the markup data that explains this graphml element
 */
Representation.prototype.readXML = function(xml) {
	var attributes = {};
	this.id = (attributes.id = xml.getAttribute("id") || this.id);
	this.xml = xml;
	return attributes;
}

/**
 * Create an HTML component to represent this graphml element
 * @param {Object} attr - information pertinent to the creation of this representation
 * @returns {DIV} a DOMElement that represents the object and may contain other DOMElements that create a specific visualization of the object
 */
Representation.prototype.createElement = function(attr) {
	var container = document.createElement("div");
	container.id = this.id+"-representation";
	return container;
}


/**
 * Get a printable representation of this object.
 * @override
 * @returns {String} a string representation of this object
 */
Representation.prototype.toString = function() {
	return "["+this.constructor.name+":"+this.id+"]";
}