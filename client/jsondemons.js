$(document).ready(function () {  
  var top = $('#menu').offset().top - parseFloat($('#menu').css('marginTop').replace(/auto/, 100));
  $(window).scroll(function (event) {
    // what the y position of the scroll is
    var y = $(this).scrollTop();

    // whether that's below the form
    if (y >= top) {
      // if so, ad the fixed class
      $('#menu').addClass('fixed');
    } else {
      // otherwise remove it
      $('#menu').removeClass('fixed');
    }
  });
});

var canvas = null;
////////////////  Jquery helpers /////////////////////////////

function computeInfo(event) {
	if (typeof event.target === 'object') {
		var id = event.target.id;
		var sl = id.indexOf('_');
		if (sl >= 1) {
			var type = id.substring(0,sl);
			var id = id.substring(sl+1);
		} else {
			var type = event.target.class || 'UNKNOWN';
		}
	} else {
		type = "INIT";
		id = "000";
	}
	return { type: type, id: id };
}

function getJsonInput(json_id) {
    return '#file_' + json_id;
}

function getJsonFromPort(port) {
    return $('#json_' + port.json_id);
}

function getTextFromJson(json_id) {
    return '#text_' + json_id;
}

function getPortDiv(port) {
    var portDiv = $("#port_" + port._id);
    return portDiv;
}
//////////   Draggging  //////////////////
function dragStop() {
    $('.json')
	.draggable()
	.draggable('disable');
    $('.port')
	.draggable()
	.draggable('disable');
    $('.line')
	.draggable()
	.draggable('disable');
}

function dragStart(type, move, stop) {
    $(type)
	.draggable()
	.draggable('enable')
        .draggable({
            start: function(event, ui) {
		stop(type, event, ui);
            },
            drag: function(event, ui) {
		// register the ports we've already moved with seenports
		seenports = {};
		move(type, event, ui);
		seenports = {};
 		// drawLines();
            },
            stop: function(event, ui) {
		stop(type, event, ui);
            }
        });
};

//////////   Canvas and Buttons  //////////////////

Template.canvas.helpers({
    jsons:  function () {
        return Jsons.find().fetch();
    },
    ports:  function () {
        return Ports.find().fetch();
    },
    lines:  function () {
        return Lines.find().fetch();
    }
});


function CurrentFunction() {
	this.context = {name: 'initialize', func: null };
	this.recording = [];
};


CurrentFunction.prototype = {
    setFunction : function(name, func) {
	this.context.func = func;
	this.context.name = name;
    },
    preventEvents : function(event) {
	event.preventDefault();
    },
    callFunction : function(event) {
	if (typeof this.context !== 'object') {
	    console.error("call SetFunction before calling callFunction");
	} else {
	    // record it before it's played in case we are switching recorders
	    this.record({command:this.context.name, event:event});
            if (this.context.func != null) {
		this.context.func(event);
	    }
	}
    },
    setRecorder : function(callback) {
	if (typeof callback === 'function') {
	    while (rec = this.recording.shift()) {
		// console.log(rec);
	        if (typeof callback === 'function') {
	    	    if (!callback(rec)) {
		        console.log("Callback failed. Keeping in buffer");
	    	        this.recording.unshift(rec);
	    	        break;
	    	    }
	        }
	    }
	    // after we are through processing, set it to this
	}
        // this may set the callback to null.
        this.callback = callback;
    },
    record : function(rec) {
	// console.log(rec);
	if (typeof this.callback === 'function') {
	    if (this.callback(rec)) {
		return true;
	    }
        }
	console.log("Callback failed. Keeping in buffer");
	this.recording.push(rec);
	return false;
    }
    
};

var currentFunction = new CurrentFunction();

/////////  EVENTS /////////////
var eventIdx = 0;

Template.canvas.events({
    'mousedown #container' : function(event) {
	console.log('canvas event', ++eventIdx);
	// currentFunction.preventEvents(event);
        currentFunction.callFunction(event);
    }
});

var port0 = null;
var port1 = null;
var json0 = null;
var json1 = null;

Template.buttons.events({
    'click #resetJSON' : function() {
        dragStop();
        currentFunction.setFunction('reset', function(event) {
            resetJson(event);
        });
    },
    'click #loadJSON' : function() {
	console.log("setting load function");
        dragStop();
        currentFunction.setFunction('load', function(event) {
	    console.log("Calling load function");
            loadJson(getJson(event)._id);
        });
    },
    'click #makeJSON' : function() {
        dragStop();
        currentFunction.setFunction('makeJSON', function(event) {
            makeJson(event);
        });
    },
    'click #delete' : function() {
        dragStop();
        currentFunction.setFunction('delete', function(event) {
            var json = getJson(event);
	    deleteJson(json);

	    var port = getPort(event);
	    deletePort(0, port)

	    var line = getLine(event);
	    if (line != null) {
		    deleteLine(0, line._id);
	    }
        });
    },
    'click #drag' : function(event) {
	    dragStart('.json', moveJson, stopJson);
	    dragStart('.port', movePort, stopPort);
	    dragStart('.line', moveLine, stopLine);
        currentFunction.setFunction('drag', function(event) {
	    console.log("in drag");
	    dragStart('.json', moveJson, stopJson);
	    dragStart('.port', movePort, stopPort);
	    dragStart('.line', moveLine, stopLine);
        });
    },
    'click #saveJSON' : function() {
        dragStop();
        currentFunction.setFunction('saveJSON', function(event) {
            var json = getJson(event);
            if (json != null) {
	    	if (typeof json.rawdata !== 'undefined' && json.rawdata !== null) {
	            var data = json.rawdata;
		    var savedJson = makeJson(event);
		    Jsons.update({"_id": savedJson._id}, {$set: { left: json.left+600, data: data }});
                    printJson(savedJson._id);
		} else {
			console.log("No raw data.  Make a change");
		}
            } else {
		console.error("Save not a JSON", event.target.id);
	    }
	});
    },
    'click #editJSON' : function() {
        dragStop();
        currentFunction.setFunction('editJSON', function(event) {
            var json = getJson(event);
            if (json != null) {
	        startEditor(json);
            } else {
		console.error("Not a JSON", event.target.id);
	    }
        });
    },
    'click #input' : function() {
        dragStop();
        currentFunction.setFunction('input', function(event) {
            var json = getJson(event);
            makePort(json, "input");
        });
    },
    'click #output' : function() {
        dragStop();
        currentFunction.setFunction('output', function(event) {
            var json = getJson(event);
	    makePort(json, "output");
        });
    },
    'click #relationship' : function() {
        dragStop();
        currentFunction.setFunction('relationship', function(event) {
	    // Register seenports here, used in 'make' for line
	    seenports = {};
            var port = getPort(event);
	    if (port != null) {
		if (port0 == null) {
			port0 = port;
	    	} else {
			port1 = port;
			if (port0.type !== port1.type) {
				makeLine(port0, port1);
			} else {
				alert("Cannot connect two similar ports");
			}
			port0 = null;
			port1 = null;
		}
	    }
	});
    },
    'click #sequenceJSON' : function() {
        dragStop();
        currentFunction.setFunction('sequence', function(event) {
            var json = getJson(event);
	    if (json != null) {
		    currentFunction.setRecorder(function(rec) {
			try {
				var x = rec.event.pageX || null;
				var y = rec.event.pageY || null;
				rec.event.target = rec.event.target || { id: 'INIT_000', result: null }
				var ti = computeInfo(rec.event);
				
				if (typeof rec.ui === 'object' && typeof rec.ui.position === 'object') {
					x = rec.ui.position.left;
					y = rec.ui.position.top;
				}
				Jsons.update({_id: json._id}, {$push: {data:
				    [JSON.stringify([rec.command,
					 ti.type,
					 ti.id,
					 rec.event.target.result,
					 x,
					 y,
					 rec.event.srcElement], null, 2)]}});
                    		printJson(json._id);
				return true;
			} catch (e) {
				alert(e);
				return false;
			}
		    });
            } else {
		currentFunction.setRecorder(null);
		alert("Couldn't record to", event.target.id, "try a JSON desktop object");
            }
	});
    }
});

//////////// JSON /////

Template.json.helpers({
    'get': function(event) {
	var ti = computeInfo(event);
	var json =  Jsons.findOne(ti.id);
	if (typeof json === 'undefined'
	  && ti.type !== 'json'
          && ti.type !== 'text'
          && ti.type != 'file') {
            json =  null;
	}
        return json;
    },
    'ports':  function (json_id) {
        return Ports.find({json_id: json_id}).fetch();
    },
    'reset': function(event) {
	var json = getJson(event);
	var iports = 0;
	var oports = 0;
	$.each(json.ports, function(index, port_id) {
		var port = Ports.findOne(port_id);
		if (port.type === "input") {
			renderPort(iports++, port_id);
		} else if (port.type === "output") {
			renderPort(oports++, port_id);
		} else {
			console.log("Bad type ",port.type,"of port for"+ port);
		}
	});
    },
    'make': function (event) {
        var id = Jsons.insert({left: event.pageX, top: event.pageY, data: [], ports: [] });
        var title = Jsons.update({"_id": id}, {$set: {title: id}});
	if (title === 0) {
		("Couldn't find the JSON you just created");
	}
	printJson(id);
        var json = Jsons.findOne(id);
        renderJson(Jsons.find().count() - 1, json);
	console.log(id);
        return json;
    },
    'load': function(json_id) {
      var fileElement = document.querySelector(getJsonInput(json_id));
      console.log("file id", getJsonInput(json_id));
      if (typeof json_id !== 'undefined' && fileElement !== null) {
	fileElement.addEventListener("change", function() {
	    console.log("change is", this);
	    var file = this.files[0];
	    var fr = new FileReader();
	    fr.onload = function(e) {
		var lines = e.target.result;
		$(getTextFromJson(json_id)).html(lines);
	    };
	    fr.readAsText(file);
	}, false);
      } else {
		alert("You need a JSON container to load into");
      }
    },
    'render': function(index, json) {
        Jsons.update({"_id": json._id},{left: 100, top: 100 });
        if (typeof json.ports !== 'undefined') {
		// something got lost...
                Jsons.update({"_id": json._id}, {$set: {ports: [], title: json._id }});
        
		json = Jsons.findOne(json._id);
	}
	$.each(json.ports, renderPort);
    },
    'edit': function(json) {
        dragStop();
        var editor = ace.edit(getTextFromJson(json._id).substr(1));
        editor.setTheme("ace/theme/monokai");
        editor.getSession().setMode("ace/mode/javascript");
        editor.on("change", function() {
            var text = editor.getValue();
	    Jsons.update({"_id": json._id}, {$set: {rawdata: text }});
        });
        return editor;
    },
    'stop': function(type, event, ui) {
	moveJson(type, event, ui);
        currentFunction.record({command:type, event:event, ui:ui});
    },
    'move': function(type, event, ui) {
	var json = getJson(event);
	if (json !== null) {
            Jsons.update({"_id": json._id}, {$set: {left: ui.position.left, top: ui.position.top}});
	    printJson(json._id);
	    seenports = {};
	    $.each(json.ports, function(pindex, port_id) {
		// only the JSON location should change the position of the port
		var updated = Ports.update({"_id": port_id}, {$set: {
			dx: 0,
			dy: 0,
		}});
	        port = Ports.findOne(port_id);
	        printPort(port_id);
		updatePort(pindex, port, 0, 0);
	    });
	} else {
		console.log("NO JSON", event);
	}
     },
    'delete': function(json) {
        if (json !== null) {
            if (typeof json.ports !== 'undefined') {
                // remove all ports from json
	        $.each(json.ports, deletePort);
                Jsons.update({"_id": json._id}, {$set: {ports: []}});
                printJson(json._id);
            }
	    Jsons.remove({_id: json._id});
        } else {
		console.log("Couldn't remove JSON");
	}
    }
});

/////// PORT ///////////
Template.port.helpers({
    'make': function(json, type) {
        if (json !== null) {
	    // relative to the JSON object
	    var offx = 602;
	    if (type === "input") {
		offx = -12;
	    }
	    var offy = 0;
	    var id = Ports.insert({type: type, left:json.left+offx, offx:offx, offy:offy, dx: 0, dy: 0, json_id: json._id, lines: []});
	    Jsons.update({"_id": json._id}, {$push: {ports: id }});
            printJson(json._id);
	    var index = Ports.find({json_id: json._id, type: type, dx: 0, dy: 0 }).count()-1;
            renderPort(index, id);
        }
     },
    'get': function(event) {
	var ti =  computeInfo(event);
	// console.log(ti.type, ti.id);
        var port = Ports.findOne(ti.id);
	if (typeof port === 'undefined' && ti.type != 'port') {
            port = null;
	}
    	return port;
    },
    'render': function(index, port_id) {
        port = Ports.findOne(port_id);
        if (port === null) {
	    console.error("Tried to render a null port");
	    return;
        }
        var jsonDiv = getJsonFromPort(port);
        var portDiv = getPortDiv(port);
	var json = Jsons.findOne(port.json_id);
	if (json != null) {
		var portTop = json.top + 15 * index;
		Ports.update({"_id": port._id}, {$set: {top: portTop}});
	    	printPort(port._id);
	}

        var divbottom = parseInt(portDiv.css("bottom"), 10);
        var jsonheight = parseInt(jsonDiv.css("height"), 10);
        if (divbottom < 0) {
            jsonDiv.css("height", (jsonheight - divbottom) + "px");
        }
    },
    'stop': function(type, event, ui) {
	// console.log("stop ", ui);
	movePort(type, event, ui);
        currentFunction.record({command:type, event:event, ui:ui});
    },
    'move': function(type, event, ui) {
        var port = getPort(event);
        if (port !== null) {
	    var json = Jsons.findOne(port.json_id);
	    var dx = ui.offset.left - ui.originalPosition.left;
	    var dy = ui.offset.top - ui.originalPosition.top;
            Ports.update({"_id": port._id}, {$set: {
		left: ui.position.left,
		top: ui.position.top,
		offx: ui.position.left - json.left,
		offy: ui.position.top - json.top
	    }});
	    port = Ports.findOne(port._id);
	    printPort(port._id);
	    updatePort(0, port, dx, dy);
        }
    },
    'delete': function(index, port_id) {
	var port = Ports.findOne(port_id);
	if (typeof port !== 'undefined' && port !== null) {
	    // remove the port from the JSON
            var json = Jsons.findOne(port.json_id);
            if (typeof json !== 'undefined') {
	        var newports = [];
	        var newIndex = 0;
	        var changed = false;
	        $.each(json.ports, function(index, p) {
	            if (port._id === p) {
	    	        changed = true;
	            } else {
		        newports[newIndex++] = json.ports[index];
	            }
	        });
	        if (changed) {
	            Jsons.update({"_id": json._id}, {$set: {ports: newports}});
                    printJson(json._id);
  	        }
            }
	    // remove the lines
	    if (typeof port.lines !== 'undefined') {
		    $.each(port.lines, deleteLine)
	    }
	    $.each(Lines.find().fetch(), function(index, line) {
			if (line.port0 === port._id || line.port1 === port._id) {
				deleteLine(index, line._id)
			}
	    });
	    console.log("Removing port", port);
            Ports.remove({_id:port._id});
        } else {
		console.log("Couldn't remove Port", port_id);
	}
    }
});

///////// JSON /////////////////////////

function loadJson(json_id) {
    return Template.json.__helpers.get('load')(json_id);
}

function resetJson(event) {
    return Template.json.__helpers.get('reset')(event);
}

function makeJson(event) {
    return Template.json.__helpers.get('make')(event);
}

function getJson (event) {
    return Template.json.__helpers.get('get')(event);
}

function renderJson(index, value) {
    Template.json.__helpers.get('render')(index, value);
}

function startEditor(json) {
    return Template.json.__helpers.get('edit')(json);
}

function stopJson(type, event, ui) {
    Template.json.__helpers.get('stop')(type, event, ui);
}

function moveJson(type, event, ui) {
    Template.json.__helpers.get('move')(type, event, ui);
}

function deleteJson(json) {
    Template.json.__helpers.get('delete')(json);
}

//////////////PORT////////////////////

function makePort(json, type) {
    return Template.port.__helpers.get('make')(json, type);
};

function getPort (event) {
    return Template.port.__helpers.get('get')(event);
}

function renderPort(index, port_id) {
    Template.port.__helpers.get('render')(index, port_id);
}

function blaze(position, template, port, parent) {
    Template.port.__helpers.get('blaze')(position, template, port, parent);
}

function stopPort(type, event, ui) {
    Template.port.__helpers.get('stop')(type, event, ui);
}

function movePort(type, event, ui) {
    Template.port.__helpers.get('move')(type, event, ui);
}

function deletePort(index, port_id) {
    Template.port.__helpers.get('delete')(index, port_id);
}

////////////////////////
function drawLines() {
	$.each(Lines.find().fetch(), renderLine);
}

///  dx dy how much something else changed port
function updatePort(index, port, dx, dy) {
	if (typeof seenports[port._id] === 'undefined') {
		seenports[port._id] = true;
			// make a backup
			var bx = dx;
			var by = dy;
			// if no delta, cancel out old line delta
			if (dx === 0 && dy === 0) {
				dx = port.dx;
				dy = port.dy;
			}
		var json = Jsons.findOne(port.json_id);
		var offx = port.offx + dx - port.dx; 
		var offy = port.offy + dy - port.dy;
		var left = json.left + offx;
		var top  = json.top  + offy;
		var updated = Ports.update({"_id": port._id}, {$set: {
			left: left,
			top: top,
			dx: bx,
			dy: by,
			offx: offx,
			offy: offy
		}});
	        // printPort(port._id);
		console.log(offx, offy);
		if (updated !== 1) {
			alert("Something wrong with update on", updated, "documents");
		}
		port = Ports.findOne(port._id);
		if (typeof port.lines !== 'undefined') {
			// console.log(port.lines);
			$.each(port.lines, function(index, line_id) {
				updateLine(index, line_id, bx, by, false);
			});
		}
	} else {
		console.log("Already seen", index, port._id);
	}
	return port;
}

var seenports = {};

//////////////
Template.line.helpers({
    'make': function(port0, port1) {
	if (port0 != null && port1 != null) {
		console.log('Inserting ',port0._id, port1._id);
		var id = Lines.insert({
			port0:port0._id,
			x1:port0.left+5,
			y1:port0.top+0,
			port1:port1._id,
			x2:port1.left+5,
			y2:port1.top+0,
			dx:0,
			dy:0
			 });
		printLine(id);
		Ports.update({"_id": port0._id}, {$push: {lines: id }});
	        printPort(port0._id);
		Ports.update({"_id": port1._id}, {$push: {lines: id }});
	        printPort(port1._id);
		var line = Lines.findOne(id);
		renderLine(Lines.find().count() - 1, line);
	} else {
		console.log("PORT MISSING", port0, port1);
	}
    },
    'get': function(event) {
	var ti =  computeInfo(event);
        var line = Lines.findOne(ti.id);
	if (typeof line === 'undefined' && ti.type != 'line') {
            line = null;
	}
    	return line;
    },
    'render': function(index, line) {
	updateLine(index, line._id, 0, 0, false);
    },
    'stop': function(type, event, ui) {
        var line = getLine(event);
        if (typeof line !== 'undefined' && line !== null) {
	    seenports = {};
	    updateLine(0, line._id, 0, 0, true);
        }
        currentFunction.record({command:type, event:event, ui:ui});
    },
    'move': function(type, event, ui) {
        var line = getLine(event);
        if (typeof line !== 'undefined' && line !== null) {
	    seenports = {};
	    var dx = ui.offset.left - ui.originalPosition.left;
	    var dy = ui.offset.top - ui.originalPosition.top;
	    console.log("delta", dx, dy, ui);
	    updateLine(0, line._id, dx, dy, true);
        }
    },
    'update': function(index, line_id, dx, dy, updatePorts) {
	var line = Lines.findOne(line_id);
	if (typeof line !== 'undefined') {
		var port0 = Ports.findOne(line.port0);
		var port1 = Ports.findOne(line.port1);
		if (typeof port0 !== 'undefined' && typeof port1 !== 'undefined') {
			// update as long as port being passed in is not the port
			if (updatePorts) {
				port0 = updatePort(0, port0, dx, dy);
				port1 = updatePort(1, port1, dx, dy);
			}

			// make a backup
			var bx = dx;
			var by = dy;
			// if no delta, cancel out old line delta
			if (dx === 0 && dy === 0) {
				dx = line.dx;
				dy = line.dy;
			}
			var x1 = port0.left + 5 + dx - line.dx;
			var y1 = port0.top  + 0 + dy - line.dy;
			var x2 = port1.left + 5 + dx - line.dx;
			var y2 = port1.top  + 0 + dy - line.dy;
			if (x1 < 0) {
				x1 = 100;
			}
			if (x2 < 0) {
				x2 = 500;
			}
			if (y1 < 0) {
				y1 = 100;
			}
			if (y2 < 0) {
				y2 = 500;
			}
			var update = Lines.update({"_id": line_id}, {$set: {
				x1: x1, y1: y1, x2: x2, y2: y2,
				dx: bx,
				dy: by
			}});
			// printLine(line._id);
			if (update === 0) {
				// toss it
				deleteLine(0, line_id);
			}
		}
	} else {
		console.log("Bad line", line_id);
		printLine(line_id);
		deleteLine(0, line_id);
	}
		
    },
    'delete': function(index, line_id) {
        if (typeof line_id != 'undefined' && line_id !== null) {
	    console.log("Removing line",line_id);
	    Lines.remove({"_id": line_id});
	    // TODO delete from ports
        } else {
	    console.log("Couldn't remove line");
	}
    }
});


function getLine (event) {
    return Template.line.__helpers.get('get')(event);
}


function stopLine(type, event, ui) {
    Template.line.__helpers.get('stop')(type, event, ui);
}

function renderLine(index, line) {
    Template.line.__helpers.get('render')(index, line);
}

function updateLine(index, line_id, dx, dy, updatePorts) {
    Template.line.__helpers.get('update')(index, line_id, dx, dy, updatePorts);
}

function makeLine(port0, port1) {
    return Template.line.__helpers.get('make')(port0, port1);
}

function moveLine(type, event, ui) {
    Template.line.__helpers.get('move')(type, event, ui);
}

function deleteLine(index, line_id) {
    Template.line.__helpers.get('delete')(index, line_id);
}

function printLine(line_id) {
	var line = Lines.findOne(line_id);
	console.log("line", line);
}

function printJson(json_id) {
	var json = Jsons.findOne(json_id);
	console.log("json", json);
}

function printPort(port_id) {
	var port = Ports.findOne(port_id);
	console.log("port", port);
}

////////////////////////
Template.canvas.onRendered(function() {
    $.each(Template.canvas.__helpers.get('jsons')(), renderJson);
});
