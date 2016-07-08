/**
 * The representation of a number of shapes.
 * Business process model (BPM*) objects are included, as are flowchart elements and designs that assist in establishing entity relationship.
 * Generic shapes encompass a variety of form and logic entities.
 * @override
 */
GenericNode.prototype = new yWorksRepresentation();
GenericNode.prototype.constructor = GenericNode;
function GenericNode(id, attributes) {
	yWorksRepresentation.call(this, id,attributes);
}

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @override
 */
GenericNode.prototype.readXML = function(xml) {
	var attributes = {};
	
	attributes.id = xml.getAttribute("id");
	yWorks.getCommonFields(attributes, xml);
	yWorks.getStyleProperties(attributes, xml);
	yWorks.getLabels(attributes, xml);
	
	var yuri = yWorks.getNamespaceURI();
	var g = xml.getElementsByTagNameNS(yuri, "GenericNode")[0];
	attributes.configuration = g.getAttribute("configuration");
	
	return attributes;
}

/**
 * Create an HTML component to represent this generic node.
 * @override
 */
GenericNode.prototype.createElement = function(attr) {
	attr = attr || this.data || {};
	var geometry = attr.geometry;
	
	var containerNode = Representation.prototype.createElement.call(this, attr);
	containerNode.className = "yWorks generic";
	
	// shape frame
	var contentNode = document.createElement("div");
	contentNode.id = attr.id+"-shape";
	contentNode.className = "yWorks generic frame";
	var style = contentNode.style;
	style.left = geometry.x+"px";
	style.top = geometry.y+"px";
	style.width = geometry.width+"px";
	style.height = geometry.height+"px";
	contentNode.appendChild( GenericNode.switchConfiguration(attr.configuration, attr) );
	containerNode.appendChild(contentNode);
	
	yWorks.createLabels(attr, containerNode);
	return containerNode;
}

/**
 * Select the configuration for the representation.
 * This hub function branches to the specific entity to be drawn in SVG.
 * It also branches to other hub functions, reflecting how complicated and varied the number of entities that fall under the banner of "GenericNode."
 * @private
 * @static
 * @param {String} configuration - the name of the configuration to be drawn
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
GenericNode.switchConfiguration = function(configuration, attributes) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	if(!attributes)
		return svg;
	
	var geometry = attributes.geometry;
	svg.setAttributeNS(null, "width", geometry.width+1);
	svg.setAttributeNS(null, "height", geometry.height+1);
	
	switch(configuration) {
		// Flowchart elements
		case "com.yworks.flowchart.cloud":
			GenericNode.createFlowChartCloud(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.terminator":
			GenericNode.createFlowChartTerminator(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.data":
			GenericNode.createFlowChartParallelogram(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.manualOperation":
			GenericNode.createFlowChartTrapazoid(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.offPageReference":
			GenericNode.createFlowChartPentagon(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.annotation":
			GenericNode.createFlowChartSpecialRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.manualInput":
			GenericNode.createFlowChartAngledTopRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.dataBase":
			GenericNode.createFlowChartCylinder(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.display":
			GenericNode.createFlowChartDisplay(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.decision":
			GenericNode.createFlowChartDiamond(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.document":
		case "com.yworks.flowchart.paperType":
			GenericNode.createFlowChartCurvedRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.delay":
		case "com.yworks.flowchart.directData":
		case "com.yworks.flowchart.storedData":
			GenericNode.createFlowChartCurvedSideRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.userMessage":
		case "com.yworks.flowchart.networkMessage":
		case "com.yworks.flowchart.preparation":
			GenericNode.createFlowChartShavedSideRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.loopLimit":
		case "com.yworks.flowchart.loopLimitEnd":
		case "com.yworks.flowchart.card":
			GenericNode.createFlowChartShavedCornerRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.process":
		case "com.yworks.flowchart.predefinedProcess":
		case "com.yworks.flowchart.internalStorage":
			GenericNode.createFlowChartRectangle(svg, configuration, attributes);
			break;
		case "com.yworks.flowchart.start1":
		case "com.yworks.flowchart.start2":
		case "com.yworks.flowchart.sequentialData":
		case "com.yworks.flowchart.onPageReference":
			GenericNode.createFlowChartCircle(svg, configuration, attributes);
			break;
		// Entity relationship elements
		case "com.yworks.entityRelationship.attribute":
			GenericNode.createEntityAttribute(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.small_entity":
			GenericNode.createEntitySmall(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.big_entity":
			GenericNode.createEntityBig(svg, configuration, attributes);
			break;
		case "com.yworks.entityRelationship.relationship":
			GenericNode.createEntityRelationship(svg, configuration, attributes);
			break;
		// Modern node elements
		case "BevelNode":
		case "BevelNodeWithShadow":
		case "BevelNode2":
		case "BevelNode3":
			GenericNode.createBevel(svg, configuration, attributes);
			break;
		case "ShinyPlateNode":
		case "ShinyPlateNodeWithShadow":
		case "ShinyPlateNode2":
		case "ShinyPlateNode3":
			GenericNode.createPlate(svg, configuration, attributes);
			break;
		// BPMN elements
		case "com.yworks.bpmn.Gateway":
		case "com.yworks.bpmn.Gateway.withShadow":
			GenericNode.createGateway(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Event":
		case "com.yworks.bpmn.Event.withShadow":
			GenericNode.createEvent(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Conversation":
		case "com.yworks.bpmn.Conversation.withShadow":
			GenericNode.createConversation(svg, configuration, attributes);
			break;
		case "com.yworks.bpmn.Artifact":
		case "com.yworks.bpmn.Artifact.withShadow":
			GenericNode.switchArtifact(svg, attributes);
			break;
		case "com.yworks.bpmn.Activity":
		case "com.yworks.bpmn.Activity.withShadow":
			GenericNode.createActivity(svg, configuration, attributes);
			break;
		default:
			console.log("No graphics for "+attributes.id+"; please construct proper "+configuration+" element");
	}
	return svg;
}

/**
 * Select the detailing for an artifact entity.
 * This hub function branches to the specific entity to be drawn in SVG.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attributes - other information essential to this function
 * @returns {SVGElement} the container of the SVG data
 */
GenericNode.switchArtifact = function(svg, attributes) {
	var type = attributes.styleProperties["com.yworks.bpmn.type"];
	switch(type) {
		case "ARTIFACT_TYPE_DATA_OBJECT":
			GenericNode.createArtifactDataObject(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_ANNOTATION":
			GenericNode.createFlowChartSpecialRectangle(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_REPLY_MESSAGE":
		case "ARTIFACT_TYPE_REQUEST_MESSAGE":
			GenericNode.createArtifactMessage(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_DATA_STORE":
			GenericNode.createDataStore(svg, type, attributes);
			break;
		case "ARTIFACT_TYPE_GROUP":
			GenericNode.createArtifactGroup(svg, type, attributes);
			break;
		default:
			console.log("Missing type graphics for "+attributes.id+"; please construct proper "+configuration+" element");
	}
}

/**
 * Select the detailing for a gateway entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to gateway-type entities.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchGatewayDetails = function(svg, attr) {
	var type = attr.styleProperties["com.yworks.bpmn.type"];
	switch(type) {
		case "GATEWAY_TYPE_PLAIN": // Nothing
			break;
		case "GATEWAY_TYPE_INCLUSIVE":
			GenericNode.createGatewayInclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_PARALLEL_EVENT_BASED_EXCLUSIVE_START_PROCESS":
			GenericNode.createGatewayParallelExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_DATA_BASED_EXCLUSIVE":
			GenericNode.createGatewayDataExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE_START_PROCESS":
		case "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE":
			GenericNode.createGatewayEventExclusive(svg, type, attr);
			break;
		case "GATEWAY_TYPE_PARALLEL":
		case "GATEWAY_TYPE_COMPLEX":
			GenericNode.createGatewayComplexParallel(svg, type, attr);
			break;
		default:
			console.log("No graphics for "+attr.id+" characteristic - '"+type+"'");
	}
}

/**
 * Select the detailing for an event entity.
 * The detailing for events consists of an exterior encircling and a central emblem.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchEventDetails = function(svg, attr) {
	GenericNode.switchEventCharacteristic(svg, attr);
	GenericNode.switchEventEmblem(svg, attr);
}

/**
 * Select the characteristic for an event entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to event-type drawings.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchEventCharacteristic = function(svg, attr) {
	var type = attr.styleProperties["com.yworks.bpmn.characteristic"]; // Outline design
	switch(type) {
		case "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_NON_INTERRUPTING": // Single outline, dashed
		case "EVENT_CHARACTERISTIC_START": // Single outline, solid
		case "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_INTERRUPTING":
			GenericNode.createEventStart(svg, type, attr);
			break;
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING": // Double line, dashed
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_CATCHING": // Double line, solid
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_INTERRUPTING":
		case "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING":
			GenericNode.createEventIntermediate(svg, type, attr);
			break;
		case "EVENT_CHARACTERISTIC_END": // Single line, solid, thick
			GenericNode.createEventEnd(svg, type, attr);
			break;
		default:
			console.log("No graphics for "+attr.id+" characteristic - '"+type+"'");
	}
}

/**
 * Select the emblem type for an event entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to event-type drawings.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchEventEmblem = function(svg, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var styleProperties = attr.styleProperties || attr;
	
	var cattr = { id:attr.id, geometry:geometry, fill:fill, borderStyle:borderStyle };
	var type1 = attr.styleProperties["com.yworks.bpmn.characteristic"]; // Outline design
	if(type1 == "EVENT_CHARACTERISTIC_INTERMEDIATE_THROWING" || type1 == "EVENT_CHARACTERISTIC_END") {
		cattr.bdColor = "none";
		cattr.bgColor = "black";
		cattr.detailColor = "white";
	}
	else {
		var w = geometry.width;
		var h = geometry.height;
		var color1 = styleProperties["com.yworks.bpmn.icon.fill"];
		var color2 = styleProperties["com.yworks.bpmn.icon.fill2"];
		cattr.bdColor = styleProperties["com.yworks.bpmn.icon.line.color"];
		cattr.bgColor = yWorks.setupLinearGradient(svg, {id:attr.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
		cattr.detailColor = cattr.bdColor;
	}
	// TODO: try to eliminate detailColor (as in EVENT_TYPE_TIMER and in EVENT_TYPE_CONDITIONAL)
	var type2 = attr.styleProperties["com.yworks.bpmn.type"]; // Central emblem
	switch(type2) {
		case "EVENT_TYPE_PLAIN": // Nothing
			break;	
		case "EVENT_TYPE_MESSAGE":
			GenericNode.createEventMessage(svg, type2, cattr);
			break;			
		case "EVENT_TYPE_TIMER":
			GenericNode.createEventTimer(svg, type2, cattr);
			break;
		case "EVENT_TYPE_TERMINATE":
			GenericNode.createEventTerminate(svg, type2, cattr);
			break;
		case "EVENT_TYPE_PARALLEL_MULTIPLE":
			GenericNode.createEventParallel(svg, type2, cattr);
			break;
		case "EVENT_TYPE_CANCEL":
			GenericNode.createEventCancel(svg, type2, cattr);
			break;
		case "EVENT_TYPE_SIGNAL":
			GenericNode.createEventSignal(svg, type2, cattr);
			break;
		case "EVENT_TYPE_COMPENSATION":
			GenericNode.createEventCompensation(svg, type2, cattr);
			break;
		case "EVENT_TYPE_LINK":
			GenericNode.createEventLink(svg, type2, cattr);
			break;
		case "EVENT_TYPE_ESCALATION":
			GenericNode.createEventEscalation(svg, type2, cattr);
			break;
		case "EVENT_TYPE_ERROR":
			GenericNode.createEventError(svg, type2, cattr);
			break;
		case "EVENT_TYPE_MULTIPLE":
			GenericNode.createEventMultiple(svg, type2, cattr);
			break;
		case "EVENT_TYPE_CONDITIONAL":
			GenericNode.createEventConditional(svg, type2, cattr);
			break;
		default:
			console.log("No graphics for "+attr.id+" emblem - '"+type2+"'");
	}
}

/**
 * Select the activity type for an artifact entity.
 * This hub function branches to the specific entity to be drawn in SVG, exclusive to artifact-type drawings.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {Object} attr - other information essential to this function
 */
GenericNode.switchActivityType = function(svg, attr) {
	var taskType = attr.styleProperties["com.yworks.bpmn.taskType"];
	if(!taskType)
		return;
	
	var svgns = "http://www.w3.org/2000/svg";
	var containerSVG = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	containerSVG.setAttributeNS(null, "x", 5);
	containerSVG.setAttributeNS(null, "y", 5);
	containerSVG.setAttributeNS(null, "height", 25);
	containerSVG.setAttributeNS(null, "width", 25);
	
	switch(taskType) {
		case "TASK_TYPE_ABSTRACT": // Nothing
			break;
		case "TASK_TYPE_SEND":
		case "TASK_TYPE_RECEIVE":
			containerSVG.setAttributeNS(null, "x", 4);
			containerSVG.setAttributeNS(null, "y", 8);
			GenericNode.createActivityMessage(containerSVG, taskType, attr);
			break;
		case "TASK_TYPE_USER":
			GenericNode.createActivityUser(containerSVG, taskType, attr);
			break;
		case "TASK_TYPE_MANUAL":
			containerSVG.setAttributeNS(null, "y", 9);
			GenericNode.createActivityManual(containerSVG, taskType, attr);
			break;
		case "TASK_TYPE_BUSINESS_RULE":
			containerSVG.setAttributeNS(null, "y", 7.25);
			GenericNode.createActivityRule(containerSVG, taskType, attr);
			break;
		case "TASK_TYPE_SERVICE":
			GenericNode.createActivityService(containerSVG, taskType, attr);
			break;
		case "TASK_TYPE_SCRIPT":
			GenericNode.createActivityScript(containerSVG, taskType, attr);
			break;
		default:
			console.log("No graphics for "+attr.id+" type - '"+taskType+"'");
	}
	svg.appendChild(containerSVG);
}

/**
 * Select na
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} attr - other information essential to this function
 */
GenericNode.switchActivityMarker = function(svg, attr) {
	var styleProperties = attr.styleProperties || attr;
	// Allocate markers (max 4)
	var markerList = [], marker = null;
	if(marker = styleProperties["com.yworks.bpmn.marker1"])
		markerList.push(marker);
	if(marker = styleProperties["com.yworks.bpmn.marker2"])
		markerList.push(marker);
	if(marker = styleProperties["com.yworks.bpmn.marker3"])
		markerList.push(marker);
	if(marker = styleProperties["com.yworks.bpmn.marker4"])
		markerList.push(marker);
	
	var containerSVG = null;
	var j = markerList.length;
	var svgns = "http://www.w3.org/2000/svg";
	var markerSVG = document.createElementNS(svgns, "svg");
	for(var i = 0, x = 0; i < j; i++) {		
		containerSVG = document.createElementNS(svgns, "svg");
		containerSVG.setAttributeNS(null, "x", x);
		containerSVG.setAttributeNS(null, "height", 15);
		containerSVG.setAttributeNS(null, "width", 15);
		
		marker = markerList[i];
		switch(marker) {
			case "BPMN_MARKER_OPEN":
			case "BPMN_MARKER_CLOSED":
				GenericNode.createActivityAccessMarker(containerSVG, marker, attr);
				break;
			case "BPMN_MARKER_AD_HOC":
				GenericNode.createActivityAdhocMarker(containerSVG, marker, attr);
				break;
			case "BPMN_MARKER_COMPENSATION":
				GenericNode.createActivityCompensationMarker(containerSVG, marker, attr);
				break;
			case "BPMN_MARKER_LOOP":
				GenericNode.createActivityLoopMarker(containerSVG, marker, attr);
				break;
			case "BPMN_MARKER_PARALLEL":
			case "BPMN_MARKER_SEQUENTIAL":
				GenericNode.createActivityBarMarker(containerSVG, marker, attr);
				break;
			default:
				console.log("No graphics for "+attr.id+" marker - '"+marker+"'");
		}
		markerSVG.appendChild(containerSVG);
		x += 20;
	}
	
	// Position on larger SVG
	var width = 15 + ((j-1)*20);
	var cx = (attr.geometry.width + width)/2 - width;
	markerSVG.setAttributeNS(null, "height", 15);
	markerSVG.setAttributeNS(null, "width", width);
	markerSVG.setAttributeNS(null, "x", cx);
	markerSVG.setAttributeNS(null, "y", (attr.geometry.height - 20));
	svg.appendChild(markerSVG);
}

/**
 * Draw a circle flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCircle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var rx = Math.min(w2, h2);
	var ry = rx;
	if(configuration.search("start1") != -1) { // The start1 element is an ellipse; the rest are circles
		rx = w2;
		ry = h2;
	}
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	ellipse.setAttributeNS(null, "rx", rx); // It's a circle that is typically longer than it is wide
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", w2 + 0.5);
	ellipse.setAttributeNS(null, "cy", h2 + 0.5);
	ellipse.setAttributeNS(null, "stroke-dasharray", yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth));
	style = ellipse.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(ellipse);
	
	// The sequential data element has a tail
	if(configuration.search("sequentialData") != -1) {
		var x = w + 0.5
		var	y = 2*h + 0.5;
		var line = document.createElementNS(svgns, "line");
		line.setAttributeNS(null, "x1", x);
		line.setAttributeNS(null, "y1", y);
		line.setAttributeNS(null, "x2", x+rx);
		line.setAttributeNS(null, "y2", y);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
	}
}

/**
 * Draw a terminator flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartTerminator = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	if(w <= h) { // Due to constraints, we're making an ellipse
		var w2 = w/2;
		var h2 = h/2;
		
		var ellipse = document.createElementNS(svgns, "ellipse");
		ellipse.setAttributeNS(null, "rx", w2);
		ellipse.setAttributeNS(null, "ry", h2);
		ellipse.setAttributeNS(null, "cx", w2 + 0.5);
		ellipse.setAttributeNS(null, "cy", h2 + 0.5);
		ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
		var style = ellipse.style;
		style.fill = color;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		
		svg.appendChild(ellipse);
	}
	else { // The terminator is pill-shaped
		var exlen = Math.abs(w - h);
		var r = h/2;
		var n = 0.666 * h;
		
		var path = document.createElementNS(svgns, "path");
		var d = "";
		d += "M "+r+" 0";
		d += " L "+(r+exlen)+" 0";
		d += " c "+ n+" 0 "+ n+" "+ h+" 0 "+ h;
		d += " L "+(r)+" "+h;
		d += " c "+(-n)+" 0 "+(-n)+" "+(-h)+" 0 "+(-h) +" Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		var style = path.style;
		style.fill = color;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		
		svg.appendChild(path);
	}
}

/**
 * Draw a rectangle flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(rect);
	
	var predefinedProcess = configuration.search("predefinedProcess") != -1;
	if(predefinedProcess || configuration.search("internalStorage") != -1) {
		var n = 9;
		if(w < 18)
			n = w/2;
		if(!predefinedProcess && h < 18)
			n = h/2;
		
		var line = document.createElementNS(svgns, "line"); // Line common to both elements
		line.setAttributeNS(null, "x1", n);
		line.setAttributeNS(null, "y1", 0);
		line.setAttributeNS(null, "x2", n);
		line.setAttributeNS(null, "y2", h);
		line.setAttributeNS(null, "stroke-dasharray", dashed);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
		
		line = document.createElementNS(svgns, "line");
		if(predefinedProcess) { // Vertical line along other side
			var x = w - n;
			line.setAttributeNS(null, "x1", x);
			line.setAttributeNS(null, "y1", 0);
			line.setAttributeNS(null, "x2", x);
			line.setAttributeNS(null, "y2", h);
		}
		else { // Horizontal line along top
			if(h < 18)
				n = h/2;
			line.setAttributeNS(null, "x1", 0);
			line.setAttributeNS(null, "y1", n);
			line.setAttributeNS(null, "x2", w);
			line.setAttributeNS(null, "y2", n);
		}
		line.setAttributeNS(null, "stroke-dasharray", dashed);
		style = line.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(line);
	}
}

/**
 * Draw a special rectangle flowchart entity, with special shaved corners, for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartShavedCornerRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var beginLoop = configuration.search("loopLimit") != -1;
	var n = 9;
	if(w < 18 || h < 18)
		n = Math.min(w, h)/2;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(beginLoop || configuration.search("card") != -1) {
		d = "M "+n+" 0";
		if(beginLoop) {
			d += " L "+(w-n)+" 0"; // The graphic for loopLimit has an opposing shaved corner
			d += " L "+(w)+" "+(n);
		}
		else
			d += " L "+(w)+" 0"; // The graphic for card has a normal corner
		d += " L "+(w)+" "+(h);
		d += " L 0 "+(h);
		d += " L 0 "+(n);
		d += " L "+(n)+" 0 Z";
	}
	else { // For loopLimitEnd (actually, an upside down loopLimit)
		d = "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w)+" "+(h-n);
		d += " L "+(w-n)+" "+(h);
		d += " L "+(n)+" "+(h);
		d += " L 0 "+(h-n);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with a shaved side for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartShavedSideRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var n = 9;
	var preparation = configuration.search("preparation") != -1;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	if(preparation || configuration.search("userMessage") != -1) {
		d = "M "+(w-n)+" 0";
		d += " L "+(w)+" "+(h2);
		d += " L "+(w-n)+" "+h;
		if(preparation) { // The graphic for preparation has opposing shaved sides
			d += " L "+(n)+" "+h;
			d += " L 0 "+(h2);
			d += " L "+(n)+" 0";
		}
		else { // The graphic for userMessage has a flat left side
			d += " L 0 "+(h);
			d += " L 0 0";
		}
		d += " L "+(w-n)+" 0 Z";
	}
	else { // For networkMessage
		d = "M 0 0";
		d += " L "+(w)+" 0";
		d += " L "+(w)+" "+h;
		d += " L 0 "+(h);
		d += " L "+(n)+" "+(h2);
		d += " L 0 0 Z";
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with an angled top for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartAngledTopRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var n = 9;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 "+(n);
	d += " L "+(w)+" 0";
	d += " L "+(w)+" "+(h);
	d += " L 0 "+(h);
	d += " L 0 "+(n)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with a curved top (and bottom) for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCurvedRectangle = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	var t = 4.5;
	var cx = w/4;
	var cx3 = 3*cx;
	if(w/h2 < 1)
		t += t * (Math.max(w/h2, 2) - 1);
	else if(w/h2 > 1)
		t *= Math.max(0.5*h2/w, 0.5);
	var cy = t*3;
	var th = h - t;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w)+" "+(th);
	d += " c "+(-cx)+" "+(-cy)+" "+(-cx3)+" "+(cy)+" "+(-w)+" 0";
	if(configuration.search("document") != -1) { // Documents are flat on top
		d += " L 0 0";
		d += " L "+(w)+" 0";
	}
	else { // Paper types have curves on top
		d += " L 0 "+(t);
		d += " c "+(cx)+" "+(cy)+" "+(cx3)+" "+(-cy)+" "+(w)+" 0";
	}
	d += " L "+(w)+" "+(th)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a special rectangle flowchart entity with curved sides for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCurvedSideRectangle = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height, h3 = h/3;
	var n = 4.5, n15 = 1.5 * n;
	var wn = w - n;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"), style = null;
	var d = "";
	d = "M "+(wn)+" 0";
	if(configuration.search("storedData") != -1) // Stored data curves inwards on the right side
		d += " c "+(-n15)+" "+(h3)+" "+(-n15)+" "+(2*h3)+" 0 "+(h);
	else // Direct-access data and delays curve outwards on the right side
		d += " c "+(n15)+" "+(h3)+" "+(n15)+" "+(2*h3)+" 0 "+(h);
	if(configuration.search("delay") != -1) { // Delays are flat on the left side
		d += " L 0 "+(h);
		d += " L 0 0";
	}
	else { // Direct-access data and stored data have opposing curves on the left side
		d += " L "+(n)+" "+(h);
		d += " c "+(-n15+1)+" "+(-h3)+" "+(-n15+1)+" "+(-2*h3)+" 0 "+(-h);
	}
	d += " L "+(wn)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(configuration.search("directData") != -1) { // A decorative curve like on the left side to simulate 3D (cylinder)
		path = document.createElementNS("http://www.w3.org/2000/svg", "path");
		d = "";
		d += "M "+(wn)+" 0";
		d += " c "+(-n15)+" "+(h3)+" "+(-n15)+" "+(2*h3)+" 0 "+(h);
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a special rectangle flowchart entity with ??? for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartSpecialRectangle = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w9 = w/9;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	style = rect.style;
	style.fill = color;
	style.stroke = "none";
	style["stroke-width"] = 0;
	svg.appendChild(rect);
	
	var polyline = document.createElementNS(svgns, "polyline");
	var points = (w9)+","+(h)+" 0,"+(h)+" 0,0 "+(w9)+",0";
	polyline.setAttributeNS(null, "points", points);
	polyline.setAttributeNS(null, "stroke-dasharray", dashed);
	style = polyline.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(polyline);
}

/**
 * Draw a display flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartDisplay = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w1 = w*0.5, w3 = 0.12*w, w2 = w - w1 - w3;
	var h = geometry.height, h2 = h/2, h3 = h/3;
	var rat = h/w;
	if(h < w) { // If h < w, w2 elongates while w1 and w3 get shorter	
		w2 += w3*rat + w1*rat;
		w1 *= (1 - rat);
		w3 *= (1 - rat);
	}
	var n = w3, n15 = 1.5*n;
	var w12 = w1/2, w14 = w1/4, w126 = w12/6;
	var cx1 = -(w12 + w14 + rat), cx2 = (w12 - w14 - rat);
	var cyw1 = -(w12 - w126), cyw2 = -(w12 + w126);
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w1)+" 0";
	d += " L "+(w1+w2)+" 0";
	d += " c "+(n15)+" "+(h3)+" "+(n15)+" "+(2*h3)+" 0 "+(h);
	d += " L "+(w1)+" "+(h);
	d += " c "+(cx1)+" "+(cyw1)+" "+(cx1)+" "+(cyw2)+" "+(-w1)+" "+(-h2);
	d += " c "+(cx2)+" "+(cyw1)+" "+(cx2)+" "+(cyw2)+" "+( w1)+" "+(-h2)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a cylinder flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCylinder = function(svg, configuration, attr) {
	// TODO: rewrite these curves
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w8 = w/8, w28 = 2*w8, w68 = 6*w8;
	var h = geometry.height, h6 = h/6;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null; // Main body of cylinder
	var d = "";
	d = "M 0 "+h6;
	d += " c "+(w28)+" "+(-h6)+" "+(w68)+" "+(-h6)+" "+w+" 0";
	d += " L "+w+" "+(5*h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	d += " L 0 "+h6+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Extra dimension-adding curve
	d = "";
	d += "M "+(w)+" "+(h6);
	d += " c "+(-w28)+" "+(h6)+" "+(-w68)+" "+(h6)+" "+(-w)+" 0";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a diamond flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartDiamond = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w2)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a parallelogram flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartParallelogram = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var n = 9;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(n)+" 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-n)+" "+(h);
	d += " L 0 "+(h);
	d += " L "+(n)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a trapezoid flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartTrapazoid = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var n = 9;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M 0 0";
	d += " L "+(w)+" 0";
	d += " L "+(w-n)+" "+(h);
	d += " L "+(n)+" "+(h);
	d += " L 0 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a pentagon flowchart entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartPentagon = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w4 = w/4, w34 = 3*w4;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d = "M "+(w4)+" 0";
	d += " L "+(w34)+" 0";
	d += " L "+(w34)+" "+(h2);
	d += " L "+(2*w4)+" "+(h);
	d += " L "+(w4)+" "+(h2);
	d += " L "+(w4)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	
	svg.appendChild(path);
}

/**
 * Draw a cloud flowchart entity for this element.
 * This entity blatantly does not look like the yWorks Cloud.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createFlowChartCloud = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var w = geometry.width;
	var h = geometry.height;
	
	this.createFlowChartCircle(svg, "start1", attr); // Yes, this is a cloud.
	
	var svgns = "http://www.w3.org/2000/svg";
	var g = document.createElementNS(svgns, "g");
	g.setAttributeNS(null, "font-size", w/4);
	g.setAttributeNS(null, "font-family", "sans-serif");
	g.setAttributeNS(null, "fill", "#C0C0C0");
	g.setAttributeNS(null, "stroke", "none");
	g.setAttributeNS(null, "text-anchor", "middle");
	svg.appendChild(g);
	
	var textElem = document.createElementNS(svgns, "text");
	textElem.setAttributeNS(null, "x", w/2);
	textElem.setAttributeNS(null, "y", 2*h/3);
	g.appendChild(textElem);
	
	textElem.appendChild(document.createTextNode("CLOUD")); // See? Perfectly legit.
}

/**
 * Draw a business process model attribute entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityAttribute = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2, cx = w2 + 0.5, rx = w2;
	var h = geometry.height, h2 = h/2, cy = h2 + 0.5, ry = h2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var ellipse = document.createElementNS(svgns, "ellipse"), style = null;
	ellipse.setAttributeNS(null, "rx", rx);
	ellipse.setAttributeNS(null, "ry", ry);
	ellipse.setAttributeNS(null, "cx", cx);
	ellipse.setAttributeNS(null, "cy", cy);
	ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = ellipse.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(ellipse);
	
	if(attr.styleProperties["doubleBorder"] && rx > 8 && ry > 8) {
		ellipse = document.createElementNS(svgns, "ellipse"), style = null;
		ellipse.setAttributeNS(null, "rx", rx - 3);
		ellipse.setAttributeNS(null, "ry", ry - 3);
		ellipse.setAttributeNS(null, "cx", cx);
		ellipse.setAttributeNS(null, "cy", cy);
		ellipse.setAttributeNS(null, "stroke-dasharray", dashed);
		style = ellipse.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(ellipse);
	}
}

/**
 * Draw a business process model small entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntitySmall = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	if(attr.styleProperties["doubleBorder"] && w > 8 && h > 8) {
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "x", 3);
		rect.setAttributeNS(null, "y", 3);
		rect.setAttributeNS(null, "width", w - 6);
		rect.setAttributeNS(null, "height", h - 6);
		rect.setAttributeNS(null, "stroke-dasharray", dashed);
		style = rect.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(rect);
	}
}

/**
 * Draw a business process model big entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityBig = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var header = h > 23;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Body
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", 5); // These are always 5
	rect.setAttributeNS(null, "ry", 5);
	rect.setAttributeNS(null, "stroke-dasharray", dashed);
	style = rect.style;
	if(header)
		style.fill = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	else
		style.fill = fill.color2; // Just the header section (see below)
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	if(header) {
		var path = document.createElementNS(svgns, "path"); // Header, not used if element is too short
		var d = "";
		d += "M 2 0";
		d += " L "+(w-2)+" 0";
		d += " L "+(w)+" 2"; // The curve is too miniscule to matter?
		d += " L "+(w)+" 23";
		d += " L 0 23";
		d += " L 0 2";
		d += " L 2 0 Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = fill.color2;
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model entity relationship for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEntityRelationship = function(svg, configuration, attr) {
	// TODO: scaling is probably not correct
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d = "M "+(w2)+" 0";
	d += " L "+(w)+" "+(h2);
	d += " L "+(w2)+" "+(h);
	d += " L 0 "+(h2);
	d += " L "+(w2)+" 0 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(attr.styleProperties["doubleBorder"] && w > 8 && h > 8) {
		path = document.createElementNS(svgns, "path");
		d = "";
		d = "M "+(w2)+" 4";
		d += " L "+(w-6)+" "+(h2);
		d += " L "+(w2)+" "+(h-4);
		d += " L 6 "+(h2);
		d += " L "+(w2)+" 4 Z";
		path.setAttributeNS(null, "d", d);
		path.setAttributeNS(null, "stroke-dasharray", dashed);
		style = path.style;
		style.fill = "none";
		style.stroke = borderStyle.borderColor;
		style["stroke-width"] = borderStyle.borderWidth;
		svg.appendChild(path);
	}
}

/**
 * Draw a business process model gateway for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createGateway = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h)/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); // Base
	var d = "";
	d += "M "+(w2)+" "+(h2-len);
	d += " L "+(w2+len)+" "+(h2);
	d += " L "+(w2)+" "+(h2+len);
	d += " L "+(w2-len)+" "+(h2);
	d += " L "+(w2)+" "+(h2-len)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	GenericNode.switchGatewayDetails(svg, attr);
}

/**
 * Draw a business process model event for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEvent = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h)/2;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // Base
	circle.setAttributeNS(null, "cx", w2 + 1);
	circle.setAttributeNS(null, "cy", h2 + 1);
	circle.setAttributeNS(null, "r", len);
	var style = circle.style;
	style.fill = color;
	style.stroke = "none";
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	GenericNode.switchEventDetails(svg, attr);
}

/**
 * Draw a business process model conversation for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createConversation = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2, w21 = w2 + 1;
	var h = geometry.height, h2 = h/2, h21 = h2 + 1;
	var len = Math.min(w, h), len2 = Math.min(w2, h2), len4 = len/4, lenh = 0.866 * len2; // cos30
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M "+(w21-len4)+" "+(h21-lenh);
	d += " L "+(w21+len4)+" "+(h21-lenh);
	d += " L "+(w21+len2)+" "+(h21);
	d += " L "+(w21+len4)+" "+(h21+lenh);
	d += " L "+(w21-len4)+" "+(h21+lenh);
	d += " L "+(w21-len2)+" "+(h21);
	d += " L "+(w21-len4)+" "+(h21-lenh)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw a business process model data object for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactDataObject = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2, w21 = w2 + 1;
	var h = geometry.height, h2 = h/2, h21 = h2 + 1;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var collection = attr.styleProperties["com.yworks.bpmn.marker1"];
	var markerParallelCollection = collection == "BPMN_MARKER_PARALLEL";
	var spec = attr.styleProperties["com.yworks.bpmn.dataObjectType"];
	var plainSpec = spec && spec.search(/(IN|OUT)PUT/i) != -1;
	if(plainSpec) { // Spec ..._PLAIN can scale forever
		w = Math.max(w, 32);
		h = Math.max(h, (markerParallelCollection ? 37 : 21));
	}
	else if(markerParallelCollection) {
		w = Math.max(w, 15);
		h = Math.max(h, 17.5);
	}
	var shrt = Math.min(w, h);
	var foldLen = shrt*0.5 - shrt*0.1; // TODO: what is this? and why is 'shrt*0.4' not acceptable?
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null, d = ""; // Outline
	d += "M 1 1";
	d += " L "+(w-foldLen)+" 1";
	d += " L "+(w)+" "+(foldLen);
	d += " L "+(w)+" "+(h);
	d += " L 1 "+(h);
	d += " L 1 1 Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Folded-over corner
	d = "";
	d += "M "+(w-foldLen)+" 1";
	d += " L "+(w-foldLen)+" "+(foldLen);
	d += " L "+(w)+" "+(foldLen);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	if(plainSpec) { // Spec ..._PLAIN does not have an arrow
		var iconLineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
		
		path = document.createElementNS(svgns, "path");
		d = "";
		d += "M 5 9";
		d += " L 13 9";
		d += " L 13 6";
		d += " L 17 11";
		d += " L 13 16";
		d += " L 13 13";
		d += " L 5 13";
		d += " L 5 9 Z";
		path.setAttributeNS(null, "d", d);
		style = path.style;
		if(spec.search("INPUT") != -1) {
			var iconFill1 = attr.styleProperties["com.yworks.bpmn.icon.fill"];
			var iconFill2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
			style.fill = yWorks.setupLinearGradient(svg, {id:attr.id+"_icon_gradient", x2:1, y2:1, width:w, height:h, color1:iconFill1, color2:iconFill2}).color;
		}
		else
			style.fill = iconLineColor;
		style.stroke = iconLineColor;
		style["stroke-width"] = 1;
		svg.appendChild(path);
	}
	
	if(markerParallelCollection) { // These three bars mark the data object as a collection
		var barw = 4;
		var barh = 15.5;
		var barx = w/2 - 7.5
		var bary = h - 1 - barh;
		var rect = null;
		
		for(var i = 0; i < 3; i++, barx += 5.5) {
			rect = document.createElementNS(svgns, "rect");
			rect.setAttributeNS(null, "x", barx);
			rect.setAttributeNS(null, "y", bary);
			rect.setAttributeNS(null, "width", barw);
			rect.setAttributeNS(null, "height", barh);
			style = rect.style;
			style.fill = "black";
			style.stroke = "none";
			style["stroke-width"] = 0;
			svg.appendChild(rect);
		}
	}
}

/**
 * Draw a business process model message for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactMessage = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var x = attr.x || 1;
	var y = attr.y || 1;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var bgColor = attr.bgColor;
	if(!bgColor) {
		var color1 = fill.color;
		var color2 = fill.color2;
		if(type.search("REPLY") != -1) { // Tint the background color darker
			if(color1) {
				var ret = yWorks.colorAndOpacity(color1);
				color1 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
				color1 = yWorks.colorAndOpacity(color1, ret.opacity).color;
			}
			if(color2) {
				var ret = yWorks.colorAndOpacity(color2);
				color2 = yWorks.shadeBlendConvert(0.25, ret.color, "#000000");
				color2 = yWorks.colorAndOpacity(color2, ret.opacity).color;
			}
		}
		bgColor = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:color1, color2:color2}).color;
	}
	var bdColor = attr.bdColor || borderStyle.borderColor;
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = null, d = null, style = null;
	path = document.createElementNS(svgns, "path"); // Upper portion
	d = "";
	d += "M "+(x+w-0.5)+" "+(y+0.5);
	d += " L "+(x+0.5)+" "+(y+0.5);
	d += " L "+(x+w2)+" "+(y+h2-0.5);
	d += " L "+(x+w-0.5)+" "+(y+0.5)+" Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = bgColor;
	style.stroke = "none";
	style["stroke-width"] = 1;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Lower portion
	d = "";
	d += "M "+(x+w-0.5)+" "+(y+1);
	d += " L "+(x+w2)+" "+(y+h2+0.5);
	d += " L "+(x+0.5)+" "+(y+1);
	d += " L "+(x+0.5)+" "+(y+h-0.5);
	d += " L "+(x+w-0.5)+" "+(y+h-0.5);
	d += " L "+(x+w-0.5)+" "+(y+1)+" Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = bgColor;
	style.stroke = "none";
	style["stroke-width"] = 0;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Outline
	d = "";
	d += "M "+(x+w)+" "+(y);
	d += " L "+(x)+" "+(y);
	d += " L "+(x)+" "+(y+h);
	d += " L "+(x+w)+" "+(y+h);
	d += " L "+(x+w)+" "+(y)+" Z";
	d += "M "+(x+w)+" "+(y);
	d += " L "+(x+w2)+" "+(y+h2);
	d += " L "+(x)+" "+(y);
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a business process model group for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createArtifactGroup = function(svg, type, attributes) {
	var geometry = attributes.geometry || attributes;
	var borderStyle = attributes.borderStyle || attributes;
	ShapeNode.rectangleShape(svg, "roundrectangle", {id:attributes.id, geometry:geometry, fill:{color:"none"}, borderStyle:borderStyle});
}

/**
 * Draw a business process model activity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivity = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width;
	var h = geometry.height;
	
	ShapeNode.rectangleShape(svg, "roundrectangle", attr);
	GenericNode.switchActivityType(svg, attr);
	GenericNode.switchActivityMarker(svg, attr);
}

/**
 * Draw an activity send and receive message entity for this element.
 * It looks like an envelope.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityMessage = function(svg, type, attr) {
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var bgColor = "white";
	if(type == "TASK_TYPE_SEND") {
		bgColor = bdColor;
		bdColor = "none";
	}
	GenericNode.createArtifactMessage(svg, "", {
		id:attr.id,
		//x:6,
		//y:8,
		geometry:{width:20, height:13},
		fill:attr.fill,
		borderStyle:attr.borderStyle,
		bgColor:bgColor,
		bdColor:bdColor
	});
}

/**
 * Draw an activity user entity for this element.
 * It looks like a person's bust.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityUser = function(svg, type, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	
	var path = document.createElementNS(svgns, "path"), d = null, style = null;
	d = "";
	d += "M 7 8.25"; // Person
	d += " L 6 9.25";
	d += " c -4 2 -4 2 -6 6.25";
	d += " L 0 20";
	d += " L 20 20";
	d += " L 20 15.5";
	d += " c -2 -4.5 -4 -5 -6 -6.25";
	d += " L 13 8.25";
	d += " C 19.75 -2.5 0.25 -2.5 7 8.25 Z";
	d += "M 6 9.25"; // Shirt collar
	d += " c -1 5 9 5 8 0";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "white";
	style.stroke = "black";
	svg.appendChild(path);

	path = document.createElementNS(svgns, "path");
	d = "";
	d += "M 5.75 5.5"; // Hair
	d += " c 4 -5 5 0 7.75 -2.5";
	d += " c -3 -3.5 -6 -3.5 -7.75 2.5 Z"
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "black";
	style.stroke = "black";
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path");
	d = "";
	d += "M 4 20"; // Right sleeve
	d += " l 0 -3.5";
	d += "M 16 20"; // Left sleeve
	d += " l 0 -3.5";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-linecap", "round");
	style = path.style;
	style.fill = "none";
	style.stroke = "black";
	svg.appendChild(path);
}

/**
 * Draw an activity manual entity for this element.
 * It looks like a hand.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityManual = function(svg, type, attr) {
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = ""; // TODO: needs application of curves
	d += "M 12 0"; // Thumb
	d += " L 3.25 0";
	d += " c -1 0.5 -2 0.5 -3.25 3";
	d += " L 0 11";
	d += " c 0.5 1 0.5 1 2 1.5";
	d += " L 15.5 12.5"; // Pinky
	d += " c 0.75 -0.8 0.75 -1.2 0 -2.5";
	d += " L 17.25 10"; // Ring
	d += " c 0.75 -0.8 0.75 -1.2 0 -2.5";
	d += " L 18 7.5"; // Middle
	d += " c 0.75 -0.8 0.75 -1.2 0 -2.5";
	d += " L 18.75 5"; // Index
	d += " c 0.75 -0.8 0.75 -1.2 0 -2.5";
	d += " L 9.25 2.5"; // Nook of palm
	d += " c 0 0 1.75 0 2.75 -2.5 Z"; // Rejoin
	d += "M 9.85 10 L 15.5 10"; // Ring, Pinky
	d += "M 10.5 7.5 L 17.25 7.5"; // Middle,Ring
	d += "M 9.3 5 L 18 5"; // Index, Middle
	d += "M 5.19 2.5 L 9.25 2.5"; // Thumb, Index
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = "white";
	style.stroke = "black";
	svg.appendChild(path);
}

/**
 * Draw an activity rule entity for this element.
 * It looks like blocky HTML.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityRule = function(svg, type, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	
	var rect = null, line = null, style = null;
	rect = document.createElementNS(svgns, "rect"); // Top field box
	rect.setAttributeNS(null, "width", 20);
	rect.setAttributeNS(null, "height", 3.5);
	style = rect.style;
	style.fill = "#c0c0c0";
	style.stroke = "black";
	svg.appendChild(rect);
	rect = document.createElementNS(svgns, "rect"); // Lower field box
	rect.setAttributeNS(null, "y", 3.5);
	rect.setAttributeNS(null, "width", 20);
	rect.setAttributeNS(null, "height", 11.25);
	style = rect.style;
	style.fill = "white";
	style.stroke = "black";
	svg.appendChild(rect);
	
	line = document.createElementNS(svgns, "line"); // Vertical division bar
	line.setAttributeNS(null, "x1", 5.25);
	line.setAttributeNS(null, "x2", 5.25);
	line.setAttributeNS(null, "y1", 3.5);
	line.setAttributeNS(null, "y2", 14.75);
	style = line.style;
	style.fill = "none";
	style.stroke = "black";
	svg.appendChild(line);
	line = document.createElementNS(svgns, "line"); // Horizontal division bar
	line.setAttributeNS(null, "x1", 0);
	line.setAttributeNS(null, "x2", 20);
	line.setAttributeNS(null, "y1", 9.125);
	line.setAttributeNS(null, "y2", 9.125);
	style = line.style;
	style.fill = "none";
	style.stroke = "black";
	svg.appendChild(line); /* */
}

/**
 * Draw an activity service entity for this element.
 * It looks like two gears, one superimposed over the other.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityService = function(svg, type, attr) {
	var svgns = "http://www.w3.org/2000/svg";
	
	var svg1 = document.createElementNS(svgns, "svg");
	svg1.setAttributeNS(null, "width", 15.65);
	svg1.setAttributeNS(null, "height", 15.65);
	GenericNode.createActivityServiceGear(svg1);
	svg.appendChild(svg1);
	
	var svg2 = document.createElementNS(svgns, "svg");
	svg2.setAttributeNS(null, "x", 5);
	svg2.setAttributeNS(null, "y", 5);
	svg2.setAttributeNS(null, "width", 15.65);
	svg2.setAttributeNS(null, "height", 15.65);
	GenericNode.createActivityServiceGear(svg2);
	svg.appendChild(svg2);
}

/**
 * Draw an activity service gear.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 */
GenericNode.createActivityServiceGear = function(svg) {
	var svgns = "http://www.w3.org/2000/svg";
	
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M 15.650 6.575"; // Right spoke top
	d += " L 12.850 6.575";
	d += " L 12.268 5.142";
	d += " L 14.238 3.172"; // Q1 spoke bottom
	d += " L 12.478 1.412"; // Q1 spoke top
	d += " L 10.508 3.382";
	d += " L 9.075 2.800";
	d += " L 9.075 0.000"; // Top spoke right
	d += " L 6.575 0.000"; // Top spoke left
	d += " L 6.575 2.800";
	d += " L 5.142 3.382";
	d += " L 3.172 1.412"; // Q2 spoke top
	d += " L 1.412 3.172"; // Q2 spoke bottom
	d += " L 3.382 5.142";
	d += " L 2.800 6.575";
	d += " L 0.000 6.575"; // Left spoke top
	d += " L 0.000 9.075"; // Left spoke bottom
	d += " L 2.800 9.075";
	d += " L 3.382 10.508";
	d += " L 1.412 12.478"; // Q3 spoke top
	d += " L 3.172 14.238"; // Q3 spoke bottom
	d += " L 5.142 12.268";
	d += " L 6.575 12.850";
	d += " L 6.575 15.650"; // Bottom spoke left
	d += " L 9.075 15.650"; // Bottom spoke right
	d += " L 9.075 12.850";
	d += " L 10.508 12.268";
	d += " L 12.478 14.238"; // Q4 spoke bottom
	d += " L 14.238 12.478"; // Q4 spoke top
	d += " L 12.268 10.508";
	d += " L 12.850 9.075";
	d += " L 15.650 9.075"; // Right spoke bottom
	d += " L 15.650 6.575 Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "white";
	style.stroke = "black";
	svg.appendChild(path);
	
	var circle = document.createElementNS(svgns, "circle")
	circle.setAttributeNS(null, "cx", 7.825);
	circle.setAttributeNS(null, "cy", 7.825);
	circle.setAttributeNS(null, "r", 2.725);
	style = circle.style;
	style.fill = "none";
	style.stroke = "black";
	svg.appendChild(circle);
}

/**
 * Draw an activity script entity for this element.
 * It looks like a sheet of paper with writing on it.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityScript = function(svg, type, attr) {	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M 20 0";
	d += " L 5.85 0";
	d += " c -15 4 7 14 -5.85 20";
	d += " L 14.15 20";
	d += " c 15 -4 -7 -14 5.85 -20 Z";
	d += "M 3.75 4 L 12.65 4"; // Text lines (4)
	d += "M 4.725 8 L 13.6 8";
	d += "M 6.5 12 L 15.25 12";
	d += "M 7.25 16 L 16 16";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = "white";
	style.stroke = "black";
	svg.appendChild(path);
}

/**
 * Draw a na entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the marker being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityAccessMarker = function(svg, type, attr) {
	var lineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"] || "black";
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null;
	rect.setAttributeNS(null, "width", 15);
	rect.setAttributeNS(null, "height", 15);
	style = rect.style;
	style.stroke = lineColor;
	style.fill = "none";
	svg.appendChild(rect);
	
	var line = document.createElementNS(svgns, "line"); // Closed
	line.setAttributeNS(null, "x1", 4);
	line.setAttributeNS(null, "x2", 11);
	line.setAttributeNS(null, "y1", 7.5);
	line.setAttributeNS(null, "y2", 7.5);
	style = line.style;
	style.stroke = lineColor;
	style.fill = "none";
	svg.appendChild(line);
	
	if(type == "BPMN_MARKER_OPEN") {
		line = document.createElementNS(svgns, "line"); // Open
		line.setAttributeNS(null, "x1", 7.5);
		line.setAttributeNS(null, "x2", 7.5);
		line.setAttributeNS(null, "y1", 4);
		line.setAttributeNS(null, "y2", 11);
		style = line.style;
		style.stroke = lineColor;
		style.fill = "none";
		svg.appendChild(line);
	}
}

/**
 * Draw a na entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the marker being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityAdhocMarker = function(svg, type, attr) {
	var lineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"] || "black";

	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M 2.25 7.5";
	d += " c 5 -3 5 3 10.5 0";
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = "none";
	style.stroke = lineColor;
	svg.appendChild(path);
	
}

/**
 * Draw a na entity for this element.
 * Due to scaling issues, the BPMN event compensation emblem can not be reused for this BPMN activity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the marker being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityCompensationMarker = function(svg, type, attr) {
	var x = attr.x || 0;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	d = "";
	d += "M 7.5 0"; // Left triangle
	d += " L 0 5.5";
	d += " L 7.5 11";
	d += " L 7.5 0 Z";
	d += "M 15 0"; // Right triangle
	d += " L 7.5 5.5";
	d += " L 15 11";
	d += " L 15 0 Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = attr.styleProperties["com.yworks.bpmn.icon.line.color"] || "black";
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a na entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the marker being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityLoopMarker = function(svg, type, attr) {
	var lineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"] || "black";
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path");
	var d = "";
	d += "M 7.5 14.5";
	d += " A 7 7 0 1 0 2.5502525316941664 12.449747468305832"; // This is very specific
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = "none";
	style.stroke = lineColor;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path");
	d = "";
	d += "M 3.0502525316941664 12.949747468305832"
	d += " L 0 12.949747468305832"
	d += "M 3.0502525316941664 12.949747468305832"
	d += " L 3.0502525316941664 9.8994949366116656"
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-linecap", "square");
	var style = path.style;
	style.fill = "none";
	style.stroke = "black";
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a na entity for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific type of the marker being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createActivityBarMarker = function(svg, type, attr) {
	var lineColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"] || "black";
	
	var svgns = "http://www.w3.org/2000/svg";
	for(var i = 0; i < 3; i++) { // Three bars, vertically from 0-3, 6-9, 12-15 for BPMN_MARKER_SEQUENTIAL
		rect = document.createElementNS(svgns, "rect");
		rect.setAttributeNS(null, "y", i*6);
		rect.setAttributeNS(null, "width", 15);
		rect.setAttributeNS(null, "height", 3);
		style = rect.style;
		style.fill = lineColor;
		style.stroke = lineColor;
		svg.appendChild(rect);
	}
	if(type == "BPMN_MARKER_PARALLEL")
		svg.setAttributeNS(null, "transform", "rotate(90 7.5 7.5)");
}

/**
 * Draw a business process model data store for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createDataStore = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2, h8 = h/8, h82 = h8/2, h78 = 7*h8;
	var y = h8;
	var color = yWorks.setupLinearGradient(svg, {id:attr.id+"-gradient", width:w, height:h, color1:fill.color, color2:fill.color2}).color;
	var dashed = yWorks.createSVGLinePattern(borderStyle.borderStyle, borderStyle.borderWidth);
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"), style = null;
	var d = "";
	d += "M 1 "+(h8-1);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(w)+" "+(h8-1);
	d += " L "+(w)+" "+(h78);
	d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(1)+" "+(1)+" "+(h78);
	d += " L 1 "+(h8-1)+" Z";
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Rim, and strip around upper rim
	d = "";
	for(var i = 0, j = 3; i < j; i++, y += h82) {
		d += "M 1 "+(y);
		d += " A "+(w2)+" "+(h8)+" "+(0)+" "+(0)+","+(0)+" "+(w)+" "+(y);
	}
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-dasharray", dashed);
	style = path.style;
	style.fill = "none";
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(path);
}

/**
 * Draw the detailing for an inclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayInclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // Bold 'o'
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", (lenSpan - 0.056 * len/2));
	var style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 0.067 * len;
	svg.appendChild(circle);
}

/**
 * Draw the detailing for a parallel exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayParallelExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var plusInner = 0.044 * len2, plusOuter = 0.356 * len2;
	
	var svgns = "http://www.w3.org/2000/svg";
	var circle = document.createElementNS(svgns, "circle"), style = null; // Circle
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", lenSpan);
	style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	var path = document.createElementNS(svgns, "path"); // Hollow '+'
	var d = "";
	d += "M "+(w2-plusInner)+" "+(h2-plusOuter);
	d += " L "+(w2+plusInner)+" "+(h2-plusOuter);
	d += " L "+(w2+plusInner)+" "+(h2-plusInner); // Top-right corner
	d += " L "+(w2+plusOuter)+" "+(h2-plusInner);
	d += " L "+(w2+plusOuter)+" "+(h2+plusInner);
	d += " L "+(w2+plusInner)+" "+(h2+plusInner); // Lower-right corner
	d += " L "+(w2+plusInner)+" "+(h2+plusOuter);
	d += " L "+(w2-plusInner)+" "+(h2+plusOuter);
	d += " L "+(w2-plusInner)+" "+(h2+plusInner); // Lower-left corner
	d += " L "+(w2-plusOuter)+" "+(h2+plusInner);
	d += " L "+(w2-plusOuter)+" "+(h2-plusInner);
	d += " L "+(w2-plusInner)+" "+(h2-plusInner); // Top-left corner
	d += " L "+(w2-plusInner)+" "+(h2-plusOuter)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw the detailing for a data exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayDataExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2;
	var boldLineWidth = 0.056 * len, lenSpan = 24.75/45 * len2 - 0.5 * boldLineWidth, wLenSpan = 0.244 * len2;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path"); // Bold 'x'
	var d = "";
	d += "M "+(w2-wLenSpan)+" "+(h2-lenSpan);
	d += " L "+(w2+wLenSpan)+" "+(h2+lenSpan);
	d += "M "+(w2+wLenSpan)+" "+(h2-lenSpan);
	d += " L "+(w2-wLenSpan)+" "+(h2+lenSpan);
	path.setAttributeNS(null, "d", d);
	path.setAttributeNS(null, "stroke-linecap", "round");
	var style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = boldLineWidth;
	svg.appendChild(path);
}

/**
 * Draw the detailing for an event exclusive gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayEventExclusive = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var color1 = attr.styleProperties["com.yworks.bpmn.icon.fill"], color2 = attr.styleProperties["com.yworks.bpmn.icon.fill2"];
	var bgColor = yWorks.setupLinearGradient(svg, {id:this.id+"_detail_gradient", x2:1, y2:1, width:w, height:h, color1:color1, color2:color2}).color;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	
	var svgns = "http://www.w3.org/2000/svg";
	var circle = document.createElementNS(svgns, "circle"); // Outer circle
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", lenSpan);
	style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	if(type == "GATEWAY_TYPE_EVENT_BASED_EXCLUSIVE") {
		circle = document.createElementNS(svgns, "circle"); // Inner circle
		circle.setAttributeNS(null, "cx", w2);
		circle.setAttributeNS(null, "cy", h2);
		circle.setAttributeNS(null, "r", (lenSpan - 0.056 * len));
		style = circle.style;
		style.fill = "none";
		style.stroke = bdColor;
		style["stroke-width"] = 1;
		svg.appendChild(circle);
	}
	
	var lenPenta = 0.156 * len;
	var xPentaA = Math.cos(0.314) * lenPenta, yPentaA = Math.sin(0.314) * lenPenta; // Angles are in radians
	var xPentaB = Math.sin(0.628) * lenPenta, yPentaB = Math.cos(0.628) * lenPenta; // Angles are in radians
	var path = document.createElementNS(svgns, "path");// Pentagon
	var d = "";
	d += "M "+(w2)+" "+(h2-lenPenta); // Top
	d += " L "+(w2-xPentaA)+" "+(h2-yPentaA); // Left
	d += " L "+(w2-xPentaB)+" "+(h2+yPentaB); // Lower left
	d += " L "+(w2+xPentaB)+" "+(h2+yPentaB); // Lower right
	d += " L "+(w2+xPentaA)+" "+(h2-yPentaA); // Right
	d += " L "+(w2)+" "+(h2-lenPenta)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw the detailing for a complex gateway entity or a parallel gateway entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container of the SVG data
 * @param {String} type - the specific type of the entity being drawn (multiple may be pooled by common strokes)
 * @param {Object} attr - other information essential to this function
 */
GenericNode.createGatewayComplexParallel = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2;
	var len = Math.min(w, h), len2 = len/2, lenSpan = 24.75/45 * len2;
	var bdColor = attr.styleProperties["com.yworks.bpmn.icon.line.color"];
	var boldLineWidth = 0.056 * len;
	
	var svgns = "http://www.w3.org/2000/svg";
	var path = document.createElementNS(svgns, "path"); // Bold '+'
	var d = "";
	d += "M "+(w2)+" "+(h2-lenSpan);
	d += " L "+(w2)+" "+(h2+lenSpan); // Vertical
	d += "M "+(w2+lenSpan)+" "+(h2);
	d += " L "+(w2-lenSpan)+" "+(h2); // Horizontal
	if(type == "GATEWAY_TYPE_COMPLEX") {  // Bold 'x', completing an asterisk '*'
		var dLenSpan = lenSpan * Math.cos(0.785);
		d += "M "+(w2-dLenSpan)+" "+(h2-dLenSpan);
		d += " L "+(w2+dLenSpan)+" "+(h2+dLenSpan); // Diagonal up
		d += "M "+(w2+dLenSpan)+" "+(h2-dLenSpan);
		d += " L "+(w2-dLenSpan)+" "+(h2+dLenSpan); // Diagonal down
	}
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = bdColor;
	style["stroke-width"] = boldLineWidth;
	svg.appendChild(path);
}

/**
 * Draw a single circular outline around this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventStart = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	var dashed = null;
	
	if(type == "EVENT_CHARACTERISTIC_START_EVENT_SUB_PROCESS_NON_INTERRUPTING")
		dashed = yWorks.createSVGLinePattern("dashed", 1);

	var circle = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M 1 "+(h2);
	d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2+len2)+" "+(h2);
	d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2-len2)+" "+(h2);
	circle.setAttributeNS(null, "d", d);
	circle.setAttributeNS(null, "stroke-dasharray", dashed);
	var style = circle.style;
	style.fill = "none"
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
}

/**
 * Draw a double circular outline around this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventIntermediate = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2, len23 = len2 - 3;
	var dashed = null;
	
	if(type == "EVENT_CHARACTERISTIC_INTERMEDIATE_BOUNDARY_NON_INTERRUPTING")
		dashed = yWorks.createSVGLinePattern("dashed", 1);
	
	var svgns = "http://www.w3.org/2000/svg";
	var circle = document.createElementNS(svgns, "path"), d = null, style = null;
	d = "";
	d += "M 1 "+(h2);
	d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2+len2)+" "+(h2);
	d += " A "+(len2)+" "+(len2)+" 0 0 1 "+(w2-len2)+" "+(h2);
	circle.setAttributeNS(null, "d", d);
	circle.setAttributeNS(null, "stroke-dasharray", dashed);
	style = circle.style;
	style.fill = "none"
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	circle = document.createElementNS(svgns, "path");
	d = "";
	d += "M 3 "+(h2);
	d += " A "+(len23)+" "+(len23)+" 0 0 1 "+(w2+len23)+" "+(h2);
	d += " A "+(len23)+" "+(len23)+" 0 0 1 "+(w2-len23-1)+" "+(h2);
	circle.setAttributeNS(null, "d", d);
	circle.setAttributeNS(null, "stroke-dasharray", dashed);
	style = circle.style;
	style.fill = "none"
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
}

/**
 * Draw a single thick circular outline around this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventEnd = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", len2-2);
	var style = circle.style;
	style.fill = "none"
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = 3;
	svg.appendChild(circle);
}

/**
 * Draw an envelope shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 * @see GenericNode.createArtifactMessage
 */
GenericNode.createEventMessage = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, mw = 0.516 * w, mx = 0.242 * w + 1;
	var h = geometry.height, mh = 0.35 * h, my = 0.325 * h + 1;
	
	GenericNode.createArtifactMessage(svg, "", {
		x:mx,
		y:my,
		geometry:{width:mw, height:mh},
		fill:attr.fill,
		borderStyle:attr.borderStyle,
		bgColor:attr.bgColor,
		bdColor:attr.bdColor
	});
}

/**
 * Draw a clock shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventTimer = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	var face = len2 - 0.166*len;
	var time = new Date(), hour = time.getHours();
	var	hAngle = -90 + hour * 30;
	var mAngle = -90 + time.getMinutes() * 6;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	var detailColor = attr.detailColor || "black";
	
	var svgns = "http://www.w3.org/2000/svg";
	var line = null, style = null;
	var circle = document.createElementNS(svgns, "circle"); // Clock face
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", face);
	style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
	
	for(var angle = 0; angle < 360;  angle += 30) { //Details; hour markings
		line = document.createElementNS(svgns, "line");
		line.setAttributeNS(null, "x1", (w2 + 0.8*face));
		line.setAttributeNS(null, "x2", (w2 + face));
		line.setAttributeNS(null, "y1", h2);
		line.setAttributeNS(null, "y2", h2);
		line.setAttributeNS(null, "transform", "rotate("+angle+" "+w2+" "+h2+")");
		style = line.style;
		style.fill = "none";
		style.stroke = detailColor;
		style["stroke-width"] = 1;
		svg.appendChild(line);
	}
	
	line = document.createElementNS(svgns, "line"); // Details; hands - hour
	line.setAttributeNS(null, "x1", (w2));
	line.setAttributeNS(null, "x2", (w2 + 0.6*face));
	line.setAttributeNS(null, "y1", h2);
	line.setAttributeNS(null, "y2", h2);
	line.setAttributeNS(null, "transform", "rotate("+hAngle+" "+w2+" "+h2+")");
	style = line.style;
	style.fill = "none";
	style.stroke = detailColor;
	style["stroke-width"] = 0.5;
	svg.appendChild(line);
	
	line = document.createElementNS(svgns, "line"); // Details; hands - minute
	line.setAttributeNS(null, "x1", (w2));
	line.setAttributeNS(null, "x2", (w2 + 0.75*face));
	line.setAttributeNS(null, "y1", h2);
	line.setAttributeNS(null, "y2", h2);
	line.setAttributeNS(null, "transform", "rotate("+mAngle+" "+w2+" "+h2+")");
	style = line.style;
	style.fill = "none";
	style.stroke = detailColor;
	style["stroke-width"] = 0.5;
	svg.appendChild(line);
}

/**
 * Draw a circular shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventTerminate = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len2 = len/2;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); // circle face
	circle.setAttributeNS(null, "cx", w2);
	circle.setAttributeNS(null, "cy", h2);
	circle.setAttributeNS(null, "r", len2 - 0.166*len);
	var style = circle.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(circle);
}

/**
 * Draw a rectangular shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventParallel = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0066 = 0.066*len, len0266 = 0.266*len;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var rect = document.createElementNS("http://www.w3.org/2000/svg", "path");
	d = "";
	d += "M "+(w2-len0066)+" "+(h2-len0266);
	d += " L "+(w2+len0066)+" "+(h2-len0266);
	d += " L "+(w2+len0066)+" "+(h2-len0066);
	d += " L "+(w2+len0266)+" "+(h2-len0066);
	d += " L "+(w2+len0266)+" "+(h2+len0066);
	d += " L "+(w2+len0066)+" "+(h2+len0066);
	d += " L "+(w2+len0066)+" "+(h2+len0266);
	d += " L "+(w2-len0066)+" "+(h2+len0266);
	d += " L "+(w2-len0066)+" "+(h2+len0066);
	d += " L "+(w2-len0266)+" "+(h2+len0066);
	d += " L "+(w2-len0266)+" "+(h2-len0066);
	d += " L "+(w2-len0066)+" "+(h2-len0066);
	d += " L "+(w2-len0066)+" "+(h2-len0266)+" Z";
	rect.setAttributeNS(null, "d", d);
	var style = rect.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(rect);
}

/**
 * Draw a thick 'x' in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventCancel = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0266 = 0.266*len, len007 = Math.max(0.07*len-1, 1);
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2-len0266+len007)+" "+(h2-len0266);
	d += " L "+(w2)+" "+(h2-len007); // Top center
	d += " L "+(w2+len0266-len007)+" "+(h2-len0266);
	d += " L "+(w2+len0266)+" "+(h2-len0266+len007);
	d += " L "+(w2+len007)+" "+(h2); // Right center
	d += " L "+(w2+len0266)+" "+(h2+len0266-len007);
	d += " L "+(w2+len0266-len007)+" "+(h2+len0266);
	d += " L "+(w2)+" "+(h2+len007); // Bottom center
	d += " L "+(w2-len0266+len007)+" "+(h2+len0266);
	d += " L "+(w2-len0266)+" "+(h2+len0266-len007);
	d += " L "+(w2-len007)+" "+(h2); // Left center
	d += " L "+(w2-len0266)+" "+(h2-len0266+len007);
	d += " L "+(w2-len0266+len007)+" "+(h2-len0266)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a triangle shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventSignal = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0266 = 0.266*len, len005 = 0.05*len, len0216 = len0266 - len005, len0166 = len0266 - 2*len005;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" "+(h2-len0216); // Top
	d += " L "+(w2+len0266)+" "+(h2+len0166); // Right
	d += " L "+(w2-len0266)+" "+(h2+len0166); // Left
	d += " L "+(w2)+" "+(h2-len0216)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw two arrow shapes in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventCompensation = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0266 = 0.266*len, len005 = 0.05*len, len0183 = 0.183*len;
	var wmod = w2 - len005;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	d = "";
	d += "M "+(wmod-len0266)+" "+(h2); // Left triangle
	d += " L "+(wmod)+" "+(h2-len0183);
	d += " L "+(wmod)+" "+(h2+len0183);
	d += " L "+(wmod-len0266)+" "+(h2)+" Z";
	d += "M "+(wmod)+" "+(h2); // Right triangle
	d += " L "+(wmod+len0266)+" "+(h2-len0183);
	d += " L "+(wmod+len0266)+" "+(h2+len0183);
	d += " L "+(wmod)+" "+(h2)+" Z";
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw an arrow shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventLink = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0266 = 0.266*len, len0033 = 0.033*len, len0079 = 0.079*len, len0183 = 0.183*len;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2-len0266+2*len0033)+" "+(h2-len0079);
	d += " L "+(w2+len0033)+" "+(h2-len0079);
	d += " L "+(w2+len0033)+" "+(h2-len0079-len0183);
	d += " L "+(w2+len0266-len0033)+" "+(h2); // Point
	d += " L "+(w2+len0033)+" "+(h2+len0079+len0183);
	d += " L "+(w2+len0033)+" "+(h2+len0079);
	d += " L "+(w2-len0266+2*len0033)+" "+(h2+len0079);
	d += " L "+(w2-len0266+2*len0033)+" "+(h2-len0079)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a thin upwards arrow shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventEscalation = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0266 = 0.266*len, len0033 = 0.033*len, len0079 = 0.079*len, len0183 = 0.183*len;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" "+(h2-len0079);
	d += " L "+(w2-len0266+len0079)+" "+(h2+len0266-len0079);
	d += " L "+(w2)+" "+(h2-len0266);
	d += " L "+(w2+len0266-len0079)+" "+(h2+len0266-len0079);
	d += " L "+(w2)+" "+(h2-len0079)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw an electrical bolt-like shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventError = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h), len0033 = 0.033*len, len0266 = 0.266*len, len007 = Math.max(0.07*len-1, 1), len5 = len/5, len10 = len5/2;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2-len0266)+" "+(h2+len0266); // Left corner
	d += " L "+(w2-len10)+" "+(h2-len0266+len007);
	d += " L "+(w2+len10)+" "+(h2+2*len0033);
	d += " L "+(w2+len0266)+" "+(h2-len0266); // Right corner
	d += " L "+(w2+len10)+" "+(h2+len0266-len007);
	d += " L "+(w2-len10)+" "+(h2-len0033);
	d += " L "+(w2-len0266)+" "+(h2+len0266)+" Z"; // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a pentagon shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventMultiple = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h);
	var len0083 = 0.083*len, len0183 = 0.183*len, len0283 = 0.283*len;
	var len025 = 0.25*len, len03 = 0.3*len;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	
	var path = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var d = "";
	d += "M "+(w2)+" "+(h2-len03); // Top
	d += " L "+(w2-len0283)+" "+(h2-len0083); // Left
	d += " L "+(w2-len0183)+" "+(h2+len025); // Bottom left
	d += " L "+(w2+len0183)+" "+(h2+len025); // Bottom right
	d += " L "+(w2+len0283)+" "+(h2-len0083); // Right
	d += " L "+(w2)+" "+(h2-len03); // Rejoin
	path.setAttributeNS(null, "d", d);
	var style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a page shape in this event entity.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} type - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createEventConditional = function(svg, type, attr) {
	var geometry = attr.geometry || attr;
	var w = geometry.width, w2 = w/2 + 1;
	var h = geometry.height, h2 = h/2 + 1;
	var len = Math.min(w, h);
	var len0258 = 0.258*len, len0204 = 0.204*len;
	var len0158 = 0.158*len, len0208 = 0.208*len, len01 = 0.1*len, len0041 = 0.041*len, len0183 = 0.183*len;
	var bgColor = attr.bgColor || "black";
	var bdColor = attr.bdColor || "black";
	var detailColor = attr.detailColor || bdColor;
	
	var path = null, d = null, style = null;
	var svgns = "http://www.w3.org/2000/svg";
	path = document.createElementNS(svgns, "path"); // Page
	d = "";
	d += "M "+(w2+len0204)+" "+(h2-len0258); // Q1
	d += " L "+(w2-len0204)+" "+(h2-len0258); // Q2
	d += " L "+(w2-len0204)+" "+(h2+len0258); // Q3
	d += " L "+(w2+len0204)+" "+(h2+len0258); // Q4
	d += " L "+(w2+len0204)+" "+(h2-len0258); // Rejoin
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = bgColor;
	style.stroke = bdColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
	
	path = document.createElementNS(svgns, "path"); // Details
	d = "";
	d += "M "+(w2-len0158)+" "+(h2-len0208); // L1-Start
	d += " L "+(w2+len0158)+" "+(h2-len0208); // L1-End
	d += "M "+(w2-len0158)+" "+(h2-len01); // L2-Start
	d += " L "+(w2+len0158)+" "+(h2-len01); // L2-End
	d += "M "+(w2-len0158)+" "+(h2+len0041); // L3-Start
	d += " L "+(w2+len0158)+" "+(h2+len0041); // L3-End
	d += "M "+(w2-len0158)+" "+(h2+len0183); // L4-Start
	d += " L "+(w2+len0158)+" "+(h2+len0183); // L4-End
	path.setAttributeNS(null, "d", d);
	style = path.style;
	style.fill = "none";
	style.stroke = detailColor;
	style["stroke-width"] = 1;
	svg.appendChild(path);
}

/**
 * Draw a plate shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createPlate = function(svg, configuration, attr) {
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width;
	var h = geometry.height;
	var c = 5; // orig 10, corner scaling is severe
	if("ModernNodeRadius" in attr.styleProperties)
		c = (attr.styleProperties["ModernNodeRadius"])/2;
	else if(configuration == "ShinyPlateNode" || configuration == "ShinyPlateNodeWithShadow")
		c = 1.5; // orig 3, corner scaling is severe
	var color = fill.color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Body
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	
	var shine = null; // Shine
	var x2 = 1;
	if(configuration == "ShinyPlateNode" || configuration == "ShinyPlateNodeWithShadow") {
		shine = document.createElementNS(svgns, "path");
		shine.setAttributeNS(null, "width", w);
		shine.setAttributeNS(null, "height", h);
		var d = "";
		d += "M 6 2";
		d += " L "+(2*w/3)+" 2";
		d += " c 0 0 0 0 0 4";
		d += " L 6 "+(4*h/5);
		d += " c 0 0 0 0 -4 0";
		d += " L 2 6";
		d += " c 0 0 0 0 4 -4 Z";
		shine.setAttributeNS(null, "d", d);
	}
	else {
		shine = document.createElementNS(svgns, "rect");
		shine.setAttributeNS(null, "width", (3*w/5 - 2));
		shine.setAttributeNS(null, "height", (2*h/3 - 2));
		shine.setAttributeNS(null, "rx", c);
		shine.setAttributeNS(null, "ry", c);
		shine.setAttributeNS(null, "transform", "translate(2,2)");
		x2 = 0.5;
	}
	style = shine.style;
	var color1 = yWorks.shadeBlendConvert(0.45, fill.color2 || color, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.65, color1, color);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"-gradient", width:w, height:h, x2:x2, y2:1,
			stops:[{offset:0.0, color:"#FFFFFF", opacity:1.0}, {offset:0.35, color:color1, opacity:1.0}, {offset:0.55, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = "none";
	style["stroke-width"] = 0;
	svg.appendChild(shine);
}

/**
 * Draw a beveled plate shape for this element.
 * @private
 * @static
 * @param {SVGElement} svg - the container for this drawing
 * @param {String} configuration - the specific configuration of the entity being drawn (multiple may be pooled by common strokes)
 * @param {String} attr - other information essential to this function
 */
GenericNode.createBevel = function(svg, configuration, attr) {
	// TODO: scaling is probably wrong
	var geometry = attr.geometry || attr;
	var fill = attr.fill || attr;
	var borderStyle = attr.borderStyle || attr;
	var w = geometry.width, w2 = w/2;
	var h = geometry.height, h2 = h/2, h8 = h/8, h82 = h8/2, h78 = 7*h8;
	var c = 5; // orig 10, corner scaling is severe
	if("ModernNodeRadius" in attr.styleProperties)
		c = (attr.styleProperties["ModernNodeRadius"])/2;
	else if(configuration == "BevelNode" || configuration == "BevelNodeWithShadow")
		c = 1.5; // orig 3, corner scaling is severe
	var color = fill.color;
	
	var svgns = "http://www.w3.org/2000/svg";
	var rect = document.createElementNS(svgns, "rect"), style = null; // Base
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Top
	rect.setAttributeNS(null, "width", w);
	rect.setAttributeNS(null, "height", h/2);
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	var color1 = yWorks.shadeBlendConvert(0.75, fill.color2 || color, "#FFFFFF");
	var color2 = yWorks.shadeBlendConvert(0.5, color1, color);
	var ret = yWorks.setupLinearGradient(svg,
		{id:attr.id+"-gradient", width:w, height:h, x2:0, y2:1,
			stops:[{offset:0.0, color:color1, opacity:1.0}, {offset:0.75, color:color2, opacity:1.0}]
		}
	);
	style.fill = ret.color;
	style.stroke = borderStyle.borderColor;
	style["stroke-width"] = borderStyle.borderWidth;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Major outline
	rect.setAttributeNS(null, "x", 2);
	rect.setAttributeNS(null, "y", 2);
	rect.setAttributeNS(null, "width", (w - 4));
	rect.setAttributeNS(null, "height", (h - 4));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = "none";
	style.stroke = yWorks.shadeBlendConvert(0.15, fill.color2 || color, "#000000");
	style["stroke-width"] = 2; // TODO: not acceptable
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Outer outline
	rect.setAttributeNS(null, "x", 1);
	rect.setAttributeNS(null, "y", 1);
	rect.setAttributeNS(null, "width", (w - 2));
	rect.setAttributeNS(null, "height", (h - 2));
	rect.setAttributeNS(null, "rx", c);
	rect.setAttributeNS(null, "ry", c);
	style = rect.style;
	style.fill = "none";
	style.stroke = "white";
	style["stroke-width"] = 1;
	svg.appendChild(rect);
	
	rect = document.createElementNS(svgns, "rect"); // Inner outline
	rect.setAttributeNS(null, "x", 3);
	rect.setAttributeNS(null, "y", 3);
	rect.setAttributeNS(null, "width", (w - 6));
	rect.setAttributeNS(null, "height", (h - 6));
	rect.setAttributeNS(null, "rx", Math.min(c - 2, c));
	rect.setAttributeNS(null, "ry", Math.min(c - 2, c));
	style = rect.style;
	style.fill = "none";
	style.stroke = "white";
	style["stroke-width"] = 1;
	svg.appendChild(rect);
}