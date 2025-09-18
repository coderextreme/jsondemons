// server/main.js
import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
// This import is crucial: it runs the code in collections.js on the server
import { Jsons, Ports, Lines } from '../imports/api/collections';

// Define publications to send data to the client
Meteor.publish("jsons", function() {
    return Jsons.find();
});
Meteor.publish("ports", function() {
    return Ports.find();
});
Meteor.publish("lines", function() {
    return Lines.find();
});

// --- SECURE SERVER-SIDE METHODS (with async/await) ---
Meteor.methods({
  /**
   * Updates the position of a JSON object and recalculates the positions
   * of its associated ports by applying a delta, preserving their relative offsets.
   */
  async 'jsons.updatePosition'(jsonId, newPosition) { // Methods are async by default, but being explicit is fine
    // Check arguments for security and correctness
    check(jsonId, String);
    check(newPosition, {
      x: Number,
      y: Number,
      z: Number
    });

    // 1. Find the JSON object to get its OLD position BEFORE updating it.
    // FIX: Use await and findOneAsync instead of findOne
    const oldJson = await Jsons.findOneAsync(jsonId);
    if (!oldJson) {
      throw new Meteor.Error('json-not-found', 'The JSON object to update was not found.');
    }

    const oldPosition = {
      x: oldJson.x,
      y: oldJson.y,
      z: oldJson.z || 0 // Default z to 0 if it doesn't exist
    };

    // 2. Calculate the delta (the amount the JSON object moved).
    const delta = {
      x: newPosition.x - oldPosition.x,
      y: newPosition.y - oldPosition.y,
      z: newPosition.z - oldPosition.z
    };
    
    // If there's no actual change in position, we can stop to avoid unnecessary writes.
    if (delta.x === 0 && delta.y === 0 && delta.z === 0) {
        console.log(`[SERVER] No position change for ${jsonId}. Skipping update.`);
        return;
    }
    
    console.log(`[SERVER] Moving json ${jsonId} by delta:`, delta);

    // 3. Update the parent JSON object with its new position.
    // FIX: Add await to ensure this completes before moving on (good practice)
    await Jsons.updateAsync(jsonId, { $set: newPosition });

    // 4. Find all associated ports and update each one by the calculated delta.
    const portIds = oldJson.ports || [];
    if (portIds.length > 0) {
      // Fetch all ports at once for efficiency
      // FIX: Use await and fetchAsync instead of fetch
      const portsToUpdate = await Ports.find({ _id: { $in: portIds } }).fetchAsync();

      // Use Promise.all to perform all updates concurrently for better performance.
      const updatePromises = portsToUpdate.map(port => {
        const portNewPos = {
          x: port.x + delta.x,
          y: port.y + delta.y,
          z: (port.z || 0) + delta.z // Ensure z exists before adding
        };
        // Return the promise from updateAsync
        return Ports.updateAsync(port._id, { $set: portNewPos });
      });
      
      // FIX: Await the Promise.all to ensure all updates are finished before the method returns.
      await Promise.all(updatePromises);
    }
    
    console.log(`[SERVER] Successfully updated json ${jsonId} and its ${portIds.length} ports.`);
  },

  /**
   * Updates the position of a single port (used for individual port dragging).
   */
  async 'ports.updatePosition'(portId, newPosition) {
    console.log(`[SERVER] Received 'ports.updatePosition' for ID ${portId} with position:`, newPosition);
    check(portId, String);
    check(newPosition, {
      x: Number,
      y: Number,
      z: Number
    });

    // FIX: Add await to the async database call.
    await Ports.updateAsync(portId, { $set: newPosition });
    console.log(`[SERVER] Successfully updated port: ${portId}`);
  }
});
