// client/main.js
import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Jsons, Ports, Lines } from '../imports/api/collections';
import './1main.html';
import './jsondemons.css';

// --- Global State ---
const activeTool = new ReactiveVar('drag');
let portConnectionState = { port0: null };

// --- Global Bridge for Clicks ---
window.X3DOM_Events = {
  handleClick(type, id) {
    const tool = activeTool.get();
    
    switch (tool) {
      case 'drag': {
        console.log(`[CLIENT] Drag ended (via onclick) for ${type} ${id}. Saving position...`);
        
        const transformNode = document.getElementById(`T_${id}`);
        
        if (transformNode) {
          const finalTranslation = transformNode._x3domNode._vf.translation;
          const newPosition = {
            x: finalTranslation.x,
            y: finalTranslation.y,
            z: finalTranslation.z
          };

          if (type === 'json') {
            Meteor.call('jsons.updatePosition', id, newPosition);
          } else if (type === 'port') {
            Meteor.call('ports.updatePosition', id, newPosition);
          }
        } else {
          console.error(`Could not find Transform node with ID 'T_${id}'`);
        }
        break;
      }
      
      case 'delete': 
        if (type === 'json') deleteJson(id); 
        if (type === 'port') deletePort(id); 
        break;
      case 'input': 
        if (type === 'json') makePort(id, 'input'); 
        break;
      case 'output': 
        if (type === 'json') makePort(id, 'output'); 
        break;
      case 'relationship': 
        if (type === 'port') handlePortConnection(id); 
        break;
    }
  }
};

// --- Subscriptions ---
Meteor.subscribe("jsons");
Meteor.subscribe("ports");
Meteor.subscribe("lines");

// --- Template: buttons ---
Template.buttons.onCreated(function() { activeTool.set('drag'); });
Template.buttons.events({
  'change input[name="tools"]'(event) {
    activeTool.set(event.target.id);
    portConnectionState = { port0: null }; 
    if (event.target.id === 'loadJSON') document.getElementById('file-input').click();
  }
});

// --- Template: myCanvas ---
Template.myCanvas.onRendered(function() {
  const menu = $('#menu');
  if (menu.length) {
    const top = menu.offset().top - parseFloat(menu.css('marginTop').replace(/auto/, 0));
    $(window).scroll(function() {
      const y = $(this).scrollTop();
      if (y >= top) menu.addClass('fixed');
      else menu.removeClass('fixed');
    });
  }
});

Template.myCanvas.helpers({
  jsons: () => Jsons.find(),
  ports: () => Ports.find(),
  lines: () => Lines.find().map(line => {
    const port0 = Ports.findOne(line.port0);
    const port1 = Ports.findOne(line.port1);
    if (port0 && port1) {
        line.x1 = port0.x; line.y1 = port0.y; line.z1 = port0.z || 0;
        line.x3 = port1.x; line.y3 = port1.y; line.z3 = port1.z || 0;
        line.x2 = (port0.x + port1.x) / 2;
        line.y2 = (port0.y + port1.y) / 2;
        line.z2 = ((port0.z || 0) + (port1.z || 0)) / 2;
    }
    return line;
  }),
});

// --- MODIFIED SECTION ---
Template.myCanvas.events({
  'click #x3dElement'(event) { // Listen for clicks directly on the x3d element
    if (activeTool.get() !== 'makeJSON') {
        return; // Do nothing if not in the correct mode
    }

    const x3dElem = event.currentTarget;
    if (!x3dElem.runtime) {
        console.error("X3DOM runtime not available.");
        return;
    }

    // 1. Get click coordinates relative to the <x3d> canvas
    const rect = x3dElem.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // 2. Get the viewing ray from the camera through the click point
    const ray = x3dElem.runtime.getViewingRay(clickX, clickY);

    // 3. Calculate the intersection of the ray with the Z=0 plane
    // The ray equation is P(t) = ray.pos + t * ray.dir
    // We want the point where P(t).z = 0.
    // So, ray.pos.z + t * ray.dir.z = 0
    // Solving for t: t = -ray.pos.z / ray.dir.z
    if (ray.dir.z === 0) {
        // Ray is parallel to the plane, cannot create an object here.
        return;
    }
    const t = -ray.pos.z / ray.dir.z;

    // 4. Find the intersection point using the calculated 't'
    const newPosition = {
        x: ray.pos.x + t * ray.dir.x,
        y: ray.pos.y + t * ray.dir.y,
        z: 0 // We are creating it on the z=0 plane
    };
    
    // 5. Call the function to create the new JSON object at this position
    makeJson(newPosition);
  },
});
// --- END OF MODIFIED SECTION ---

// --- Template helpers ---
Template.json.helpers({ isDraggable() { return activeTool.get() === 'drag'; } });
Template.port.helpers({ isDraggable() { return activeTool.get() === 'drag'; } });

// --- Action Functions (Unchanged) ---
function makeJson(position) {
  const id = Jsons.insert({ x: position.x, y: position.y, z: 0, data: "{}", ports: [] });
  Jsons.update(id, { $set: { title: id } });
}
function deleteJson(jsonId) {
  const json = Jsons.findOne(jsonId);
  if (json) {
    (json.ports || []).forEach(portId => deletePort(portId));
    Jsons.remove(jsonId);
  }
}
function makePort(jsonId, type) {
  const json = Jsons.findOne(jsonId);
  if (!json) return;
  const portCount = Ports.find({ json_id: jsonId, type: type }).count();
  const offx = (type === 'input') ? -12 : 12;
  const offy = 15 - (portCount * 5);
  const portId = Ports.insert({
    type,
    json_id: jsonId,
    x: json.x + offx,
    y: json.y + offy,
    z: json.z || 0,
    color: (type === 'input') ? '0 1 0' : '0 0 1',
    lines: []
  });
  Jsons.update(jsonId, { $push: { ports: portId } });
}
function deletePort(portId) {
  const port = Ports.findOne(portId);
  if (port) {
    (port.lines || []).forEach(lineId => deleteLine(lineId));
    Jsons.update(port.json_id, { $pull: { ports: portId } });
    Ports.remove(portId);
  }
}
function handlePortConnection(portId) {
  const port = Ports.findOne(portId);
  if (!port) return;
  if (!portConnectionState.port0) {
    portConnectionState.port0 = port;
  } else {
    const port0 = portConnectionState.port0;
    const port1 = port;
    if (port0._id !== port1._id && port0.type !== port1.type) {
      makeLine(port0, port1);
    }
    portConnectionState = { port0: null };
  }
}
function makeLine(port0, port1) {
    const lineId = Lines.insert({
      port0: port0._id,
      port1: port1._id
    });
    Ports.update(port0._id, { $push: { lines: lineId } });
    Ports.update(port1._id, { $push: { lines: lineId } });
}
function deleteLine(lineId) {
    const line = Lines.findOne(lineId);
    if (line) {
        Ports.update(line.port0, { $pull: { lines: lineId } });
        Ports.update(line.port1, { $pull: { lines: lineId } });
        Lines.remove(lineId);
    }
}
