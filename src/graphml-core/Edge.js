/**
 * The basic container of a graphml edge element.
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Edge.prototype = new GraphmlElement();
Edge.prototype.constructor = Edge;
function Edge(id, attributes) {
	GraphmlElement.call(this, id, attributes);
}

/**
 * Get basic valid attribute data from the edge entity
 * @override
 */
Edge.prototype.getGraphmlAttributes = function(xml, attributes) {
	attributes = attributes || {};
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		attributes.directed = xml.getAttribute("directed") == "true";
		var source = attributes.source = xml.getAttribute("source");
		var target = attributes.target = xml.getAttribute("target");
		if(!source || !target) {
			var err = [];
			if(!source)
				err.push("source");
			if(!target)
				err.push("target");
			console.log("The edge element '"+attributes.id+"' is missing one or more of its endpoints - "+err);
		}
	}
	return attributes;
}