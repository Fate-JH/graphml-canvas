/**
 * The basic container of a graphml hyperedge element.
 * Hyperedges are generalizations of edges in the sense that they do not only relate two endpoints to each other, but express a relation between an arbitrary number of enpoints.
 * @constructor
 * @param {String} id - an unique identifier for this element
 * @param {Object} shape - the optional, but recommended, behaviors that maintain the visual component of the element
 * @param {Object} attributes - a reference copy of the original information passed into the function (only set if there is no representation)
 */
Hyperedge.prototype = new GraphmlElement();
Hyperedge.prototype.constructor = Hyperedge;
function Hyperedge(id, shape, attributes) {
	GraphmlElement.call(this, id, shape, attributes);
}

/**
 * Get basic valid attribute data from the hyperedge entity
 * @override
 */
Hyperedge.prototype.getGraphmlAttributes = function(xml, attributes) {
	if(xml) {
		GraphmlElement.prototype.getGraphmlAttributes.call(this, xml,attributes);
		var endpoints = attributes.endpoints = [];
		var points = xml.getElementsByTagName("endpoint");
		var j = points.length;
		if(j) {
			for(var i = 0, j = points.length; i < j; i++) {
				var point = points[i];
				endpoints.push(point.getAttribute("node"));
			}
		}
		if(!endpoints.length)
			console.log("The hyperedge element '"+attributes.id+"' has no endpoints");
	}
	return attributes;
}