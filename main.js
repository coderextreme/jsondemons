Jsons = new Meteor.Collection("jsons");
Ports = new Meteor.Collection("ports");
Lines = new Meteor.Collection("lines");

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

if (Meteor.isClient) {
	Meteor.subscribe("jsons");
	Meteor.subscribe("ports");
	Meteor.subscribe("lines");
}

if (Meteor.isServer) {
	Lines.remove({});
	// Jsons.insert({left:0, top:30, title:"JSON Object 0", data: JSON.stringify([])});
	// Jsons.insert({left:300, top:30, title:"JSON Object 1", data: JSON.stringify([0,1,2,3,4])});
	// Jsons.insert({left:600, top:30, title:"JSON Object 2", data: JSON.stringify({"x":10, "y":10})});
	// Jsons.insert({left:0, top:130, title:"JSON Object 3", data: JSON.stringify({"name":"John"})});
	// Jsons.insert({left:300, top:130, title:"JSON Object 4", data: JSON.stringify({})});
}
