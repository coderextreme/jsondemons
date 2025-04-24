import { Meteor } from 'meteor/meteor';
import { Jsons, Ports, Lines } from '../imports/api/collections';

Meteor.startup(() => {
    // Server-side startup code
    // Uncomment these if you want to reset/initialize collections
    // Lines.remove({});
    // Ports.remove({});
    // Jsons.remove({});
    // Jsons.insertAsync({...});
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
	Jsons.insertAsync({x:0, y:30, z:0, title:"JSON Object 0", data: []});
	Jsons.insertAsync({x:300, y:30, z:0, title:"JSON Object 1", data: [0,1,2,3,4]});
	Jsons.insertAsync({x:600, y:30, z:0, title:"JSON Object 2", data: {"x":10, "y":10}});
	Jsons.insertAsync({x:0, y:130, z:0, title:"JSON Object 3", data: {"name":"John"}});
	Jsons.insertAsync({x:300, y:130, z:0, title:"JSON Object 4", data: {}});
}
