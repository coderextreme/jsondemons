// imports/api/collections.js
import { Mongo } from 'meteor/mongo';
import { Meteor } from 'meteor/meteor';

export const Jsons = new Mongo.Collection('jsons');
export const Ports = new Mongo.Collection('ports');
export const Lines = new Mongo.Collection('lines');

// This code only runs on the server
if (Meteor.isServer) {
  // --- SERVER-SIDE SECURITY RULES ---
  Jsons.allow({
    insert() { return true; },
    // FIX: Disallow direct client updates. All updates should go through Methods.
    // We leave a minimal rule for the 'title' and 'ports' updates, but position is now method-only.
    update(userId, doc, fieldNames, modifier) {
      const allowedFields = ['title', 'ports']; // Position fields ('x','y','z') are removed
      return fieldNames.every(fieldName => allowedFields.includes(fieldName));
    },
    remove() { return true; }
  });

  Ports.allow({
    insert() { return true; },
    // FIX: Disallow direct client updates for position.
    update(userId, doc, fieldNames, modifier) {
       const allowedFields = ['lines']; // Position fields ('x','y','z') are removed
       return fieldNames.every(fieldName => allowedFields.includes(fieldName));
    },
    remove() { return true; }
  });

  Lines.allow({
    insert() { return true; },
    update() { return false; }, // Not needed, client doesn't update lines directly
    remove() { return true; }
  });

  // --- DATABASE SEEDING ---
  Meteor.startup(async () => {
    // Only seed the database if it's completely empty
	Lines.removeAsync({});
	Ports.removeAsync({});
	Jsons.removeAsync({});

    if (await Jsons.find().countAsync() === 0) {
      console.log("Database is empty. Seeding with initial data...");

      await Jsons.insertAsync({x:-30, y:20, z:0, title:"JSON Object 1", data: '{"x":10, "y":10}', ports: []});
      await Jsons.insertAsync({x:0,   y:20, z:0, title:"JSON Object 2", data: '[0,1,2,3,4]', ports: []});
      await Jsons.insertAsync({x:30,  y:20, z:0, title:"JSON Object 3", data: '[]', ports: []});
      await Jsons.insertAsync({x:-30, y:-20, z:0, title:"JSON Object 4", data: '["x", "y", "z"]', ports: []});
      await Jsons.insertAsync({x:0,   y:-20, z:0, title:"JSON Object 5", data: '{"name":"John"}', ports: []});
      await Jsons.insertAsync({x:30,  y:-20, z:0, title:"JSON Object 6", data: '{}', ports: []});

      console.log("Database seeding complete.");
    } else {
      console.log("Database already contains data. Skipping seeding.");
    }
  });
}
