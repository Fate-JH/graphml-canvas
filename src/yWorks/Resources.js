/**
 * This is a basic storage class for the yWorks resources XML list that is attached to the <graphml> element.
 * @property {String} id - fixed identifier that reads "Resources"
 * @property {Array[String]} res - an Array of Strings of data
 * @constructor
 * @param {Object} attributes - an object that contains pertinent data for the setup of this object
 * @param {DOMElement} attributes.xml - the structured data in xml format, starting from the <Resources> element
 */
function Resources(attributes) {
	this.res = [];
	
	if(attributes && attributes.xml)
		this.readXML(attributes.xml);
}
Resources.id = "Resources";
Resources["yfiles.type"] = "resources";

/**
 * Parse extended markup for the purposes of building this element's representation.
 * @private
 * @param {DOMElement} xml - the structured data in xml format, starting from the <Resources> element
 */
Resources.prototype.readXML = function(xml) {
	this.setResources(xml.children);
}

/**
 * Retrieve all data.
 * @return {Array[String]} an Array of Strings of data
 */
Resources.prototype.getResources = function() {
	return this.res;
}

/**
 * Retrieve a specific entry of data.
 * @param {Number} index - the index of an entry in the Array of data
 * @return {String} the retrieved data
 */
Resources.prototype.getResource = function(index) {
	return this.res[index];
}

/**
 * Replace the resource data.
 * @param {Array[String]} res - an Array of Strings of data
 * @return {Array[String]} an Array of Strings of old data
 */
Resources.prototype.setResources = function(res) {
	var j = res ? res.length : 0;
	if(!j)
		return [];
	
	var oldResources = this.res;
	var resources = this.res = [];
	for(var i = 0; i < j; i++) {
		var entry = res[i];
		var content = entry.firstChild && entry.firstChild.nodeValue;
		if(content) {
			content = content.replace(/&lt;/g, "<").replace(/&gt;/g, ">"); // Switch out xml-safe encoding for normal symbol
			resources.push(content);
		}
	}
	return oldResources;
}

/**
 * Replace a specific entry in the resource data.
 * @param {Number} index - the index of an entry in the Array of data
 * @param {String} res - a String of data
 * @return {String} a String of old data
 */
Resources.prototype.setResource = function(index, res) {
	console.log("Resources.setResource: not yet supported.");
	return null;
}