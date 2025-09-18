// server/main.tests.js
import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { Jsons, Ports } from '../imports/api/collections';
import './main.js'; // This imports the file where your methods are defined

if (Meteor.isServer) {
  describe('JSON Demons Methods', () => {

    // Clean up database before and after each test
    beforeEach(() => {
      Jsons.removeAsync({});
      Ports.removeAsync({});
    });

    afterEach(() => {
      Jsons.removeAsync({});
      Ports.removeAsync({});
    });

    describe('jsons.updatePosition', () => {
      it('should update the position of a json and its child ports', () => {
        // ARRANGE: Set up the initial state
        const jsonId = Jsons.insertAsync({ x: 0, y: 0, z: 0, ports: [] });
        const portId = Ports.insertAsync({ json_id: jsonId, type: 'output', x: 12, y: 15, z: 0 });
        Jsons.updateAsync(jsonId, { $push: { ports: portId } });
        
        const newPosition = { x: 50, y: -50, z: 10 };

        // ACT: Call the method
        Meteor.server.method_handlers['jsons.updatePosition'].apply({}, [jsonId, newPosition]);
        
        // ASSERT: Check the results
        const updatedJson = Jsons.findOneAsync(jsonId);
        const updatedPort = Ports.findOneAsync(portId);

        assert.strictEqual(updatedJson.x, 50, 'JSON x-coordinate should be updated');
        assert.strictEqual(updatedJson.y, -50, 'JSON y-coordinate should be updated');
        assert.strictEqual(updatedJson.z, 10, 'JSON z-coordinate should be updated');

        // Check that the port moved relative to the JSON
        assert.strictEqual(updatedPort.x, 50 + 12, 'Port x-coordinate should be relative to new JSON position');
        assert.strictEqual(updatedPort.y, -50 + 15, 'Port y-coordinate should be relative to new JSON position');
        assert.strictEqual(updatedPort.z, 10, 'Port z-coordinate should match new JSON position');
      });
    });

    describe('ports.updatePosition', () => {
      it('should update the position of a single port', () => {
        // ARRANGE
        const portId = Ports.insertAsync({ x: 0, y: 0, z: 0 });
        const newPosition = { x: 100, y: 100, z: 5 };

        // ACT
        Meteor.server.method_handlers['ports.updatePosition'].apply({}, [portId, newPosition]);
        
        // ASSERT
        const updatedPort = Ports.findOneAsync(portId);
        assert.deepStrictEqual({ x: updatedPort.x, y: updatedPort.y, z: updatedPort.z }, newPosition, 'Port position should match the new position');
      });
    });
  });
}
