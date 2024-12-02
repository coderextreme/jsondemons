import { Meteor } from 'meteor/meteor';
import { Jsons, Ports, Lines } from '../imports/api/collections';

Meteor.startup(() => {
    // Server-side startup code
    // Uncomment these if you want to reset/initialize collections
    // Lines.remove({});
    // Ports.remove({});
    // Jsons.remove({});
    // Jsons.insert({...});
});

if (Meteor.isServer) {
	Meteor.publish("jsons", function() {
		return Jsons.find();
	});
	Meteor.publish("ports", function() {
		return Ports.find();
	});
	Meteor.publish("lines", function() {
		return Lines.find();
	});
}

if (Meteor.isServer) {
	// Lines.remove({});
	// Ports.remove({});
	// Jsons.remove({});
	// Jsons.insert({left:0, top:30, title:"JSON Object 0", data: JSON.stringify([])});
	// Jsons.insert({left:300, top:30, title:"JSON Object 1", data: JSON.stringify([0,1,2,3,4])});
	// Jsons.insert({left:600, top:30, title:"JSON Object 2", data: JSON.stringify({"x":10, "y":10})});
	// Jsons.insert({left:0, top:130, title:"JSON Object 3", data: JSON.stringify({"name":"John"})});
	// Jsons.insert({left:300, top:130, title:"JSON Object 4", data: JSON.stringify({})});
}
