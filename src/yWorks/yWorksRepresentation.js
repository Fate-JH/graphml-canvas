/**
 *
 */
yWorksRepresentation.prototype = new Representation();
yWorksRepresentation.prototype.constructor = yWorksRepresentation;
function yWorksRepresentation(id, attributes) {
	Representation.call(this, id,attributes);
}

/**
 * Get the two-dimensional coordinates and span that explains the canvas-space this element should occupy.
 * @override
 */
yWorksRepresentation.prototype.getBounds = function() {
	var attr = this.getAttributes();
	var g = attr.geometry || attr;
	var X = g.x || 0;
	var Y = g.y || 0;
	var W = g.width || 0;
	var H = g.height || 0;
	return { x:X, y:Y, width:W, height:H };
}

/**
 * Provide updated two-dimensional coordinates and span for this element.
 * @override
 * @returns {Boolean} always returns true
 */
yWorksRepresentation.prototype.setBounds = function(bounds) {
 	bounds = bounds || {};
	var attr = this.data;
	var geometry = attr.geometry;
	if("x" in bounds)
		geometry.x = bounds.x;
	if("y" in bounds)
		geometry.y = bounds.y;
	if("width" in bounds)
		geometry.width = bounds.width;
	if("height" in bounds)
		geometry.height = bounds.height;
	return true;
}

/**
 * Move all related elements of this representation, elements and labels.
 * @param {Number} dx - the x-coordinate displacement
 * @param {Number} dy - the y-coordinate displacement
 */
yWorksRepresentation.prototype.shift = function(dx, dy) {
	dx = dx || 0;
	dy = dy || 0;
	
	var attr = this.data;
	var geometry = attr.geometry;
	geometry.x += dx;
	geometry.y += dy;
	
	var labels = attr.nodeLabels || [];
	for(var i = 0, j = labels.length; i < j; i++) {
		labels[i].x += dx;
		labels[i].y += dy;
	}
}