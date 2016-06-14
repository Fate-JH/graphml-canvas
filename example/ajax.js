/**
 * We will be needing AJAX to work on this page.
 * For that, we will be needing a working XMLHttpRequest object (and may also need ActiveX).
 * Do not log or show the status upon success.  It is not necessary.
 * @throws {Error} if there is no ActiveX when needed
 * @throws {Error} if, ultimately, the XMLHttpRequest object can not be created
 */
function ajax() {
	if(typeof(XMLHttpRequest) === "undefined") {
		// Attempt backwards compatibility for certain Internet Explorer versions
		if(typeof(window.ActiveXObject) === "undefined")
			throw new Error("This web page blocks or does not support ActiveX.  ActiveX is necessary for backwards compatability for XMLHttpRequests on this page.");
		
		var XMLHTTP = ["Msxml2.XMLHTTP.6.0", "Msxml2.XMLHTTP.3.0", "Microsoft.XMLHTTP"], type = "";
		for(var i = 0, j = XMLHTTP.length; i < j; i++) {
			try {
				type = XMLHTTP[i];
				new window.ActiveXObject(type); // Try to generate it independently as a test
			}
			catch(err) {
				console.log("Could not create ActiveX object of protocol "+type+".");
				continue;
			}
			
			// Successful object creation
			XMLHttpRequest = function() {
				return new window.ActiveXObject(type);
			}
			methodTest();
			return;
		}
		throw new Error("This browser will not support an XMLHttpRequest.");
	}
}

function methodTest() {
	if(!XMLHttpRequest.addEventListener) {
		XMLHttpRequest.addEventListener = customAddEventListener;
		XMLHttpRequest.removeEventListener = customRemoveEventListener;
		XMLHttpRequest.validateEvent = validateEvent;
		XMLHttpRequest.getEventList = getEventList;
		XMLHttpRequest.fireEvents = fireEvents;
		XMLHttpRequest.onreadystatechange = customOnReadyStateChange;
	}
}

function customOnReadyStateChange() {
	switch(this.readyState) {
		case 0: // request not initialized (unsent)
		case 1: // server connection established (open called)
			break;
		case 2: // request received (headers)
		case 3: // processing request (downloading ...)
			this.fireEvents("progress", this);
			break;
		case 4: // request finished and response is ready (done)
			var resultStatus = this.status;
			if(resultStatus == 200) {
				this.fireEvents("load", this);
				break;
			}
			else if(resultStatus == 404) {
				this.fireEvents("error", this);
				break;
			}
		default:
			console.log("XMLHttpRequest encountered strange state - "+this.readyState)
	}
}

function customAddEventListener(evt, func, async) {
	if(!this.validateEvent(evt))
		return;
	
	var list = this.getEventList(evt);
	for(var i = 0, j = list.length; i < j; i++) {
		if(list[i] === func)
			return; // Duplicate function
	}
	list.push(func);
}

function customRemoveEventListener(evt, func) {
	if(!this.validateEvent(evt))
		return;
	
	var list = this.getEventList(evt);
	for(var i = 0, j = list.length; i < j; i++) {
		if(list[i] === func) {
			list.splice(i, 1); // Found duplicate function
			break;
		}
	}
}

function validateEvent(evt) {
	if(!this.validEvents) {
		this.validEvents = {progress:0, load:0, error:0, abort:0};
	}
	return evt in this.validEvents;
}

function getEventList(evt) {
	if(!this.eventList)
		this.eventList = {};
	if(evt in this.eventList)
		this.eventList[evt] = [];
	return this.eventList[evt];
}

function fireEvents(type, evt) {
	var callBackList = this.eventList[type] || [];
	for(var i = 0, j = callBackList.length; i < j; i++) {
		callBackList[i].call(this, evt);
	}
}