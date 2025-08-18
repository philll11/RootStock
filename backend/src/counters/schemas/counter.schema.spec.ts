import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import { Counter, CounterDocument, CounterSchema } from './counter.schema';

describe('Counter Schema Business Logic', () => {
  let mongoServer: MongoMemoryServer;
  let mongoConnection: Connection;
  let counterModel: Model<Counter>;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    mongoConnection = (await connect(uri)).connection;
    counterModel = mongoConnection.model<Counter>(Counter.name, CounterSchema);
  });

  afterAll(async () => {
    await mongoConnection.close();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await counterModel.deleteMany({});
  });

  describe('RootStock Entity Counter Management', () => {
    it('should support all core RootStock entity counters', async () => {
      // Arrange: Create counters for all core RootStock entities
      const coreEntityCounters = [
        { _id: 'subsidiary', prefix: 'SUB', sequence_value: 0 },
        { _id: 'client', prefix: 'CLI', sequence_value: 0 },
        { _id: 'user', prefix: 'USR', sequence_value: 0 },
        { _id: 'role', prefix: 'ROL', sequence_value: 0 },
        { _id: 'orchard', prefix: 'ORC', sequence_value: 0 },
      ];

      // Act & Assert: Each core entity counter should save successfully
      for (const counterData of coreEntityCounters) {
        const counter = new counterModel(counterData);
        const savedCounter = await counter.save();
        
        expect(savedCounter._id).toBe(counterData._id);
        expect(savedCounter.prefix).toBe(counterData.prefix);
        expect(savedCounter.sequence_value).toBe(0);
      }
    });

    it('should handle counter sequences reaching high production volumes', async () => {
      // Arrange: Business scenario - large client with thousands of records
      const highVolumeCounter = {
        _id: 'client',
        prefix: 'CLI',
        sequence_value: 50000, // Real production scenario
      };

      // Act
      const counter = new counterModel(highVolumeCounter);
      const savedCounter = await counter.save();

      // Assert: High sequence numbers should be supported for scalability
      expect(savedCounter.sequence_value).toBe(50000);
    });

    it('should support business prefix evolution for organizational changes', async () => {
      // Arrange: Business scenario - organization rebrands or restructures
      const evolvedPrefixes = [
        { _id: 'subsidiary', prefix: 'SUB-2025', sequence_value: 100 },
        { _id: 'client_legacy', prefix: 'OLD_CLI', sequence_value: 200 },
        { _id: 'client_new', prefix: 'NEW_CLI', sequence_value: 0 },
      ];

      // Act & Assert: Different prefix formats should coexist during transitions
      for (const counterData of evolvedPrefixes) {
        const counter = new counterModel(counterData);
        const savedCounter = await counter.save();
        expect(savedCounter.prefix).toBe(counterData.prefix);
      }
    });

    it('should support multi-tenant counter separation by region', async () => {
      // Arrange: Business scenario - different prefixes for different regions/tenants
      const regionalCounters = [
        { _id: 'client_au', prefix: 'AU_CLI', sequence_value: 0 },
        { _id: 'client_us', prefix: 'US_CLI', sequence_value: 0 },
        { _id: 'client_eu', prefix: 'EU_CLI', sequence_value: 0 },
      ];

      // Act & Assert: Regional separation should be supported
      for (const counterData of regionalCounters) {
        const counter = new counterModel(counterData);
        const savedCounter = await counter.save();
        expect(savedCounter._id).toBe(counterData._id);
        expect(savedCounter.prefix).toBe(counterData.prefix);
      }
    });
  });

  describe('Business-Critical Counter Operations', () => {
    it('should support atomic counter increments for concurrent recordId generation', async () => {
      // Arrange: Business scenario - multiple users creating records simultaneously
      const counter = new counterModel({
        _id: 'user',
        prefix: 'USR',
        sequence_value: 100,
      });
      await counter.save();

      // Act: Atomic increment operation (critical for CountersService)
      const updatedCounter = await counterModel.findOneAndUpdate(
        { _id: 'user' },
        { $inc: { sequence_value: 1 } },
        { new: true, returnDocument: 'after' }
      );

      // Assert: Atomic operations must work for thread-safe recordId generation
      expect(updatedCounter).toBeDefined();
      expect(updatedCounter?.sequence_value).toBe(101);
    });

    it('should handle counter reset scenarios for system maintenance', async () => {
      // Arrange: Business scenario - administrator resets counter sequence
      const counter = new counterModel({
        _id: 'test_entity',
        prefix: 'TEST',
        sequence_value: 9999,
      });
      await counter.save();

      // Act: Reset counter for maintenance (business workflow)
      const resetCounter = await counterModel.findByIdAndUpdate(
        'test_entity',
        { $set: { sequence_value: 0 } },
        { new: true }
      );

      // Assert: Counter resets should be supported for system administration
      expect(resetCounter).toBeDefined();
      expect(resetCounter?.sequence_value).toBe(0);
    });

    it('should prevent counter conflicts with proper entity identification', async () => {
      // Arrange: Business scenario - ensure each entity type has unique counter
      const userCounter = new counterModel({
        _id: 'user',
        prefix: 'USR',
        sequence_value: 50,
      });
      const clientCounter = new counterModel({
        _id: 'client', // Different entity, different counter
        prefix: 'CLI',
        sequence_value: 50, // Same sequence number is OK for different entities
      });

      // Act: Save both counters
      const savedUserCounter = await userCounter.save();
      const savedClientCounter = await clientCounter.save();

      // Assert: Different entities can have separate counter sequences
      expect(savedUserCounter._id).toBe('user');
      expect(savedClientCounter._id).toBe('client');
      expect(savedUserCounter.sequence_value).toBe(50);
      expect(savedClientCounter.sequence_value).toBe(50); // Same value, different entity
    });
  });

  describe('Counter System Integration Points', () => {
    it('should maintain correct collection structure for CountersService integration', () => {
      // Assert: Verify the schema structure matches CountersService expectations
      expect(counterModel.collection.name).toBe('counters');
      
      const paths = counterModel.schema.paths;
      expect(paths).toHaveProperty('_id'); // Entity identifier
      expect(paths).toHaveProperty('prefix'); // Business key prefix
      expect(paths).toHaveProperty('sequence_value'); // Current sequence number
    });

    it('should support the CountersService query pattern for recordId generation', async () => {
      // Arrange: Set up counter as CountersService would
      const counter = new counterModel({
        _id: 'orchard',
        prefix: 'ORC',
        sequence_value: 42,
      });
      await counter.save();

      // Act: Simulate CountersService atomic increment and retrieve
      const result = await counterModel.findOneAndUpdate(
        { _id: 'orchard' },
        { $inc: { sequence_value: 1 } },
        { new: true }
      );

      // Assert: Result should provide data for recordId generation
      expect(result).toBeDefined();
      expect(result?.prefix).toBe('ORC');
      expect(result?.sequence_value).toBe(43);
      
      // This would generate recordId: "ORC043" in CountersService
      const expectedRecordId = `${result?.prefix}${String(result?.sequence_value).padStart(3, '0')}`;
      expect(expectedRecordId).toBe('ORC043');
    });
  });
});
