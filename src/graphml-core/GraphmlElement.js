/**
 * The base class that represents the pure graphml container of a graph element.
 * As an abstraction this class serves as a container for the Representation object.
 * This class should not need to be extended or modified unless the graphml schema changes.
 * @property {String} id - a unique identifier for this element
 * @property {Function|Object} representation - the optional, but recommended, behaviors that maintain the visual component of the element
 * @property {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 * @abstract
 * @constructor
 * @param {String} id - a unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
function GraphmlElement(id, attributes) {
	this.id = id;
	this.representation = null;
	this.attributes = null;
	this.owner = null;
	
	if(attributes)
		this.setRepresentation(attributes.shape);
	if(attributes)
		this.readXML(attributes);
}

/**
 * Get the identifier of the graphml element.
 * @returns {String} an identifier
 */
GraphmlElement.prototype.getId = function() {
	return this.id;
}

/**
 * Provide a new identifier for the graphml element.
 * @param {String} id - an identifier
 * @returns {Boolean} always returns true
 */
GraphmlElement.prototype.setId = function(id) {
	this.id = id;
	// TODO: what to do if the representation was already created
	return true;
}

/**
 * Get the significant local identifier of the graphml element.
 * this is the last portion of an element's id.
 * @returns {String} an identifier
 */
GraphmlElement.prototype.getLocalId = function() {
	return this.id.slice(this.id.lastIndexOf("::")+1);
}

/**
 * Provide a new significant local identifier for the graphml element.
 * @param {String} id - an identifier
 * @returns {Boolean} always returns true
 */
GraphmlElement.prototype.setLocalId = function(id) {
	if(id.search("::") > -1) {
		console.log("GraphmlElement: can not set a local id that tries to nest the element.")
	}
	var name = this.id.split("::");
	name[name.length-1] = id;
	this.id = name.join("::");
	// TODO: what to do if the representation was already created
	return true;
}

/**
 * Get the additional data that was included when the graphml element was created.
 * If the Representation of the element has been created, prioritize the data known to that object instead.
 * @returns {Object} the additional data
 */
GraphmlElement.prototype.getAttributes = function() {
	return this.attributes;
}

/**
 * Provide new additional data after the element exists.
 * @param {Object} attributes - the additional data
 * @returns {Object} any old additional data that we are replacing
 */
GraphmlElement.prototype.setAttributes = function(attributes) {
	var attr = this.attributes;
	this.attributes = attributes;
	return attr;
}

/**
 * Get the visualization of this element.
 * @return {Function|Object} if the visualization has not yet been created, will return the constructor; if the visualization has been created, will return that
 */
GraphmlElement.prototype.getRepresentation = function() {
	return this.representation;
}

/**
 * Assign the visualization of this element.
 * @param {Function} shape - the constructor of the visualization of the element
 * @returns {Boolean} always returns true at this time
 */
GraphmlElement.prototype.setRepresentation = function(shape) {
	this.representation = shape;
	return true;
}

/**
 * Get the name that describes the visualization of element (equivalent to the visualization's constructor).
 * @returns {String} the descriptor, or an empty string if no descriptor
 */
GraphmlElement.prototype.getRepresentationName = function() {
	if(this.representation) {
		if(typeof(this.representation) == "function")
			return this.representation.name;
		else
			return this.representation.constructor.name;
	}
	else
		return "";
}

/**
 * Provide an updated visualization name.
 * You should not be allowed to do this?
 * @param {String} a new visualization class name, in theory
 * @returns {String} always returns false
 */
GraphmlElement.prototype.setRepresentationName = function(shape) {
	return false;
}

/**
 * na
 */
GraphmlElement.prototype.getParent = function() {
	return this.owner;
}

/**
 * na
 */
GraphmlElement.prototype.setParent = function(owner) {
	this.owner = owner;
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @returns {Object} o - an object that contains the coordinates and span
 * @returns {Number} o.x - the x-coordinate of the element's top-left corner ("left" in HTML)
 * @returns {Number} o.y - the y-coordinate of the element's top-left corner ("top" in HTML)
 * @returns {Number} o.width - the span called width
 * @returns {Number} o.height - the span called height
 */
GraphmlElement.prototype.getBounds = function() {
	var rep = this.representation;
	if(rep && typeof(rep) == "object")
		return rep.getBounds();
	else {
		return { x:0, y:0, width:0, height:0 };
	}
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
GraphmlElement.prototype.setBounds = function(bounds) {
	return false;
}

/**
 * Accept and parse extended markup for the purposes of building this element's representation.
 * @param {Object} attributes - information pertinent to this function
 * @param {XML} attributes.xml - the markup data that explains this graphml element
 */
GraphmlElement.prototype.readXML = function(attributes) {
	attributes = attributes || {};
	var xml = attributes.xml;
	
	this.getGraphmlAttributes(xml, attributes);
	this.setAttributes(attributes);
	this.id = attributes.id;
}

/**
 * Get basic valid attribute data from the graphml entity.
 * The attributes collected by this method are, in general, the barebones requirement for a given graphml element.
 * Consequentially, warning messages may be printed to the console.
 * @param {XML} xml - the markup data that explains this graphml element
 * @param {Object} attributes - optional, existing data pertinent to this entity
 * @return {Object} attributes - the object that was passed or created to store the data
 */
GraphmlElement.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml)
		this.id = attributes.id = xml.getAttribute("id") || this.constructor.name;
	return attributes;
}

/**
 * Create an HTML component to represent this graphml element
 * @param {Object} attr - information pertinent to the creation of this representation
 * @returns {DIV} a DOMElement that represents the object and may contain other DOMElements that create a specific visualization of the object
 */
GraphmlElement.prototype.createElement = function(attr) {
	var rep = this.representation;
	
	var container = document.createElement("div");
	container.id = this.id;
	container.className = this.constructor.name.toLowerCase();
	if(rep && typeof(rep) == "object")
		container.appendChild( rep.createElement(attr) );
	else 
		console.log(this.constructor.name+" "+ this.id +" does not have a visual representation.");
	return container;
}

/**
 * Get a printable representation of this object.
 * @override
 * @returns {String} a string representation of this object
 */
GraphmlElement.prototype.toString = function() {
	var str = "["+this.constructor.name+":"+this.id;
	
	var rep = this.representation;
	if(rep) {
		str += " asa "
		if(typeof(rep) == "object")
			str += rep.toString();
		else
			str += this.getRepresentationName();
	}
	
	str += "]";
	return str;
}