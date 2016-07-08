/**
 * na
 */
TableNode.prototype = new yWorksRepresentation();
TableNode.prototype.constructor = TableNode;
function TableNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * na
 * returns {Boolean} true, if at least one of the measurements is a non-zero; false, otherwise
 */
TableNode.getInsets = function(attributes, xml) {
	var left = attributes.left = +xml.getAttribute("left");
	var right = attributes.right = +xml.getAttribute("right");
	var top = attributes.top = +xml.getAttribute("top");
	var bottom = attributes.bottom = +xml.getAttribute("bottom");
	return !!(left || right || top || bottom);
}

/**
 * na
 */
TableNode.prototype.readXML = function(xml) {
	var attributes = {};

	attributes.id = this.id;
	attributes["foldertype"] = xml.getAttribute("yfiles.foldertype");
	
	var g;
	var yuri = yWorks.getNamespaceURI();
	g = xml.getElementsByTagNameNS(yuri, "TableNode")[0];
	var field = null
	yWorks.getCommonFields(attributes, g);
	yWorks.getLabels(attributes, g);
	yWorks.getStyleProperties(attributes, g);
	ProxyAutoBoundsNode.getStateAndInsets(attributes, g); // Identical fields
	attributes.configuration = g.getAttribute("configuration");
	// Table
	var table = attributes.table = {};
	var tElem = g.getElementsByTagNameNS(yuri, "Table")[0];
	TableNode.getInsets((table.defaultColumnInsets = {}), tElem.getElementsByTagNameNS(yuri, "DefaultColumnInsets")[0]);
	TableNode.getInsets((table.defaultRowInsets = {}), tElem.getElementsByTagNameNS(yuri, "DefaultRowInsets")[0]);
	TableNode.getInsets((table.insets = {}), tElem.getElementsByTagNameNS(yuri, "Insets")[0]);
	
	var gElems = null, fieldGroup = null, fields = null;
	var numRows = 0, numCols = 0;
	// Table columns
	gElems = tElem.getElementsByTagNameNS(yuri, "Columns")[0];
	fieldGroup = table.columns = [];
	fields = gElems.getElementsByTagNameNS(yuri, "Column");
	for(var i = 0, j = fields.length; i < j; i++) {
		var obj = {};
		var field = fields[i];
		obj.id = field.getAttribute("id");
		obj.width = +field.getAttribute("width");
		obj.minimumWidth = +field.getAttribute("minimumWidth");
		if( TableNode.getInsets((obj.insets = {}), field.getElementsByTagNameNS(yuri, "Insets")[0]) )
			numCols++;
		fieldGroup.push(obj);
	}
	// Table rows
	gElems = tElem.getElementsByTagNameNS(yuri, "Rows")[0];
	fieldGroup = table.rows = [];
	fields = gElems.getElementsByTagNameNS(yuri, "Row");
	for(var i = 0, j = fields.length; i < j; i++) {
		var obj = {};
		var field = fields[i];
		obj.id = field.getAttribute("id");
		obj.height = +field.getAttribute("height");
		obj.minimumHeight = +field.getAttribute("minimumHeight");
		if( TableNode.getInsets((obj.insets = {}), field.getElementsByTagNameNS(yuri, "Insets")[0]) )
			numRows++;
		fieldGroup.push(obj);
	}
	table.numberOfColumns = numCols;
	table.numberOfRows = numRows;
	return attributes;
}

/**
 * Create an HTML component to represent this table.
 * @override
 */
TableNode.prototype.createElement = function(attr) {
	attr = attr || this.data;
	var geometry = attr.geometry;
	var fill = attr.fill;
	var borderStyle = attr.borderStyle;
	var styleProperties = attr.styleProperties;
	var w = geometry.width;
	var h = geometry.height;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var containerNode = Representation.prototype.createElement.call(this, attr), style = null;
	containerNode.className = "yWorks table";
	
	var contentNode = document.createElement("div"), style = null;
	contentNode.id = attr.id+"-shape";
	contentNode.className = "yWorks table shape";
	style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = w+"px";
	style.height = h+"px";
	containerNode.appendChild(contentNode);
	
	var svgns = "http://www.w3.org/2000/svg";
	var svg = document.createElementNS(svgns, "svg");
	svg.setAttributeNS(null, "width", w);
	svg.setAttributeNS(null, "height", h);
	contentNode.appendChild(svg);
	
	var rect = document.createElementNS(svgns, "rect"); // Primary frame
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = fill.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	var table = attr.table;
	var rows = table.rows;
	var columns = table.columns;
	var numberOfRows = table.numberOfRows;
	var numberOfColumns = table.numberOfColumns;
	var lanesAsColumns = styleProperties["yed.table.lane.style"] == "lane.style.columns";
	var rowHeaderColorMain = styleProperties["yed.table.header.color.main"];
	var rowHeaderColorAltr = styleProperties["yed.table.header.color.alternating"];
	var colHeaderColorMain = styleProperties["yed.table.section.color"];
	var colHeaderColorAltr = styleProperties["yed.table.section.color"];
	var laneColorMain = styleProperties["yed.table.lane.color.main"];
	var laneColorAltr = styleProperties["yed.table.lane.color.alternating"];
	if(lanesAsColumns) {
		colLaneColorMain = colHeaderColorMain; // Temporary, for swapping
		colHeaderColorMain = rowHeaderColorMain;
		colHeaderColorAltr = rowHeaderColorAltr;
		rowHeaderColorMain = colLaneColorMain;
		rowHeaderColorAltr = colLaneColorMain;
	}
	
	var x = 0;
	var y = table.insets.top;
	var rect = null, style = null;
	// Column headers?
	var h = table.defaultColumnInsets.top;
	if(numberOfRows)
		x += table.defaultRowInsets.left;
	for(var i = 0; i < numberOfColumns; i++) {
		var col = columns[i];
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "x", x);
		rect.setAttributeNS(null, "y", y);
		rect.setAttributeNS(null, "width", col.width);
		rect.setAttributeNS(null, "height", h);
		rect.setAttributeNS(null, "stroke-dasharray", dashed);
		style = rect.style;
		style.fill = (i%2 ? colHeaderColorAltr : colHeaderColorMain);
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(rect);
		x += col.width;
	}
	y += h;
	x = 0;
	// Row leaders?
	var w = table.defaultRowInsets.left;
	for(var i = 0, dy = y; i < numberOfRows; i++) {
		var row = rows[i];
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "x", x);
		rect.setAttributeNS(null, "y", dy);
		rect.setAttributeNS(null, "width", w);
		rect.setAttributeNS(null, "height", row.height);
		rect.setAttributeNS(null, "stroke-dasharray", dashed);
		style = rect.style;
		style.fill = (i%2 ? rowHeaderColorAltr : rowHeaderColorMain);
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(rect);
		dy += row.height;
	}
	x += w;
	// Rows and columns
	for(var i1 = 0; i1 < rows.length; i1++) {
		var row = rows[i1];
		var dx = x;
		for(var i2 = 0, j2 = columns.length; i2 < j2; i2++) {
			var col = columns[i2];
			rect = document.createElementNS(svgns, "rect");
			rect.setAttributeNS(null, "x", dx);
			rect.setAttributeNS(null, "y", y);
			rect.setAttributeNS(null, "width", col.width);
			rect.setAttributeNS(null, "height", row.height);
			rect.setAttributeNS(null, "stroke-dasharray", dashed);
			style = rect.style;
			style.fill = (lanesAsColumns ? i2 % 2 : i1 % 2) ? laneColorAltr : laneColorMain;
			style.stroke = borderStyle.borderColor;
			style["stroke-width"] = borderStyle.borderWidth;
			svg.appendChild(rect);
			dx += col.width;
		}
		y += row.height;
	}
	
	yWorks.createLabels(attr, containerNode);
	return containerNode;
}