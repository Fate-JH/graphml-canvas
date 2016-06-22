/*
#IFNDEF namespaces
#DEF namespaces {}
#ENDIF
*/
if(!document.namespaces) {
	document.namespaces = {};
}


/**
 * Find a namespace by schema that is within a given scope
 * @static
 * @param {String} uri - a unique namespace URI
 * @return {GraphmlNamespace} a scoped namespace object with the same identifier
 */
GraphmlNamespace.get = function(uri) {
	return document.namespaces[uri];
}


/**
 * A namespace for specific graphml classes and functionality
 * @property {String} uri - a namespace URI
 * @property {Object} classList - a mapping of namespace-scoped classes
 * @property {String} s in classList - the name of a class
 * @property {Function} classList[s] - the constructor for the class
 * @property {Boolean} isScoped - whether or not this namespace is available (scoped) to other elements in this environment
 * @constructor
 * @param {String} uri - the unique namespace URI
 * @param {Boolean} unscoped - optional; if evaluated to false, add this namespace to the scope upon creation
 */
/*
A namespace is scoped when it is available in a particular environment, i.e., the document.
A class is scoped when it is added to a namespace.  Class scoping is neither strict nor reflexive.
*/
function GraphmlNamespace(uri, unscoped) {
	this.uri = uri;
	this.classList = {};
	this.isScoped = false;
	
	if(!unscoped) {
		if(!GraphmlNamespace.get(uri))
			this.scope();
		else
			console.log("Namespace: not allowed to scope a new namespace that already is defined within the same scope - "+schema);
	}
}

/**
 * Add this namespace to the current scope
 * @param {Boolean} overwrite - if a namespace conflict exists, prioritize this namespace over the existing one
 * @returns {Boolean} the value of property isScoped is at the end of the function (true, if it has been added or was already added)
 */
GraphmlNamespace.prototype.scope = function(overwrite) {
	if(!this.isScoped) {
		var namespaces = document.namespaces;
		var uri = this.uri;
		if(!namespaces[uri]) { // Not yet scoped
			namespaces[uri] = this;
			this.isScoped = true;
		}
		else if(namespaces[uri] === this) { // Already scoped
			console.log("Namespace "+uri+": already scoped");
			this.isScoped = true;
			return true;
		}
		else { // Check if can be scoped
			var oldNamespace = namespaces[uri];
			var willScope = true;
			if(oldNamespace) { // Existing namespace; can we descope it?
				console.log("Namespace: existing namespace already found scoped under the schema "+this.uri);
				if(!!overwrite)
					willScope = oldNamespace.descope();
			}
			if(willScope) {
				namespaces[uri] = this;
				this.isScoped = true;
			}
		}
	}
	
	if(this.isScoped)
		console.log("Namespace "+this.uri+": adding oneself to the current scope");
	return this.isScoped;
}

/**
 * Remove this namespace from the current scope
 * @returns {Boolean} true, always (may change later)
 */
GraphmlNamespace.prototype.descope = function() {
	console.log("Namespace "+this.uri+": removing oneself from current scope");
	delete document.namespaces[this.uri];
	this.isScoped = false;
	return true;
}

/**
 * Does this namespace think it is currently scoped?
 * @returns {Boolean} true, if scoped; false, otherwise
 */
GraphmlNamespace.prototype.getScope = function() {
	return this.isScoped;
}
 
/**
 * Return the URI for this namespace
 * @returns {String} the unique identifying URI that belongs to this namespace
 */
GraphmlNamespace.prototype.getNamespaceURI = function() {
	return this.uri;
}

/**
 * Give this namespace a new URI, if conditions allow
 * @property {String} uri - the unique namespace URI
 * @returns {Boolean} true, if this namespace has the new schema; false, otherwise
 */
GraphmlNamespace.prototype.setNamespaceURI = function(uri) {
	var oldURI = this.uri;
	if(oldURI == uri)
		return true;
	
	if(this.isScoped) {
		var namespaces = document.namespaces;
		if(namespaces[uri]) {
			console.log("GraphmlNamespace "+oldURI+": not allowed to change to a namespace that already specifies another namespace within this scope");
			return false;
		}
		namespaces[ns] = namespaces[oldURI];
		delete namespaces[oldURI];
	}
	this.uri = uri;
	return true;
}

/**
 * Get all the classes scoped to this namespace
 * returns {Object} o - the mapping between indetifications for each class constructor function and the function
 */
GraphmlNamespace.prototype.getClasses = function() {
	return this.classList;
}

/**
 * Include all mapped classes as a part of this namespace
 * @param {Object} classlist - a mapping of identifications to functions that resolve into classes
 * @param {String} id in classlist - the identification of a constructor function
 * @param {Function} classlist[id] - the constructor function
 * @returns {Boolean} always returns true at the moment
 */
GraphmlNamespace.prototype.setClasses = function(classlist) {
	for(var id in classlist) {
		this.setSpecificClass(id, classlist[id]);
	}
	return true;
}

/**
 * Get a specific class scoped to this namespace
 * @param {String} name - the identification of a constructor function
 * @returns {Function} the constructor function associated with parameter name
 */
GraphmlNamespace.prototype.getSpecificClass = function(name) {
	return this.classList[name];
}

/**
 * Include the specific mapped class as a part of this namespace
 * @param {String} name - the identification of a constructor function; if blank, it is set to the function's name (newClass.name)
 * @param {Function} newClass - the constructor function
 * @returns {Boolean} always returns true at the moment
 */
GraphmlNamespace.prototype.setSpecificClass = function(name, newClass) {
	if(!newClass || typeof(newClass) != "function")
		return false;
	name = name || newClass.name;
	if(!name)
		return false;
	
	var existingClasses = this.classList;
	var oldClass = existingClasses[name];
	existingClasses[name] = newClass;
	return true;
}

/**
 * Override this function to serve as an entry point for setting up the nodes from their data.
 * @static
 * @abstract
 * @param {GraphmlCanvas} canvas - the drawing surface controlling (access to) the HTML components through Javascript
 * @param {GraphmlPaper} graph - the structure that contains all of the deployed graphml node data
 * @property {XML} data - the original graphml data
 * @param {Object} attributes - optional, additional information for correctly preparing and drawing the node data
 */
GraphmlNamespace.prototype.setup = function(canvas, graph, xml, attributes) {
	console.log("Please provide a namespace-custom setup implementation.");
}

/**
 * Compare these two object, this namespace and another entity, for equivalence
 * @param {Object} o - the object being compared against
 * @returns {Boolean} true, if o is a namespace equivalent to this namespace; false, otherwise
 */
GraphmlNamespace.prototype.equals = function(o) {
	// TODO: This is currently not a very good equivalence check.
	if(o) {
		var otype = typeof(o);
		if(otype != "object")
			return false;
		if((typeof(this) != otype) || (this.constructor != o.constructor))
			return false;
	
		return this.uri == o.getNamespaceURI();
	}
	return false;
}

/**
 * Convert this namespace to a string with useful data
 * @returns {String} a string representation of this namespace
 */
GraphmlNamespace.prototype.toString = function() {
	var classList = this.classList, classListLen = 0, classListString = "";
	for(var id in classList) {
		classListLen += (+!!classList[id]);
		classListString += classList[id].name+",";
	}
	
	var output = "{namespace: "+this.uri+", status: "+(this.isScoped ? "scoped" : "unscoped")+", classes["+classListLen+"]";
	if(classListLen)
		output += "=["+classListString.slice(0,(classListLen-1))+"]"
	output += "}";
	
	return output;
}