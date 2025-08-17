import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, connect } from 'mongoose';
import { Counter, CounterDocument, CounterSchema } from './counter.schema';

describe('Counter Schema', () => {
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

  describe('schema validation', () => {
    it('should SUCCEED creating counter with valid data', async () => {
      // Arrange
      const validCounter = {
        _id: 'subsidiary',
        prefix: 'SUB',
        sequence_value: 0,
      };

      // Act
      const counter = new counterModel(validCounter);
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter._id).toBe('subsidiary');
      expect(savedCounter.prefix).toBe('SUB');
      expect(savedCounter.sequence_value).toBe(0);
    });

    it('should SUCCEED with default sequence_value when not provided', async () => {
      // Arrange
      const counterData = {
        _id: 'client',
        prefix: 'CLI',
        // sequence_value not provided, should default to 0
      };

      // Act
      const counter = new counterModel(counterData);
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter.sequence_value).toBe(0);
    });

    it('should FAIL when _id is missing', async () => {
      // Arrange
      const invalidCounter = {
        // _id is missing
        prefix: 'SUB',
        sequence_value: 0,
      };

      // Act & Assert
      const counter = new counterModel(invalidCounter);
      await expect(counter.save()).rejects.toThrow();
    });

    it('should FAIL when prefix is missing', async () => {
      // Arrange
      const invalidCounter = {
        _id: 'subsidiary',
        // prefix is missing
        sequence_value: 0,
      };

      // Act & Assert
      const counter = new counterModel(invalidCounter);
      await expect(counter.save()).rejects.toThrow();
    });

    it('should SUCCEED with high sequence_value', async () => {
      // Arrange
      const counterWithHighSequence = {
        _id: 'user',
        prefix: 'USR',
        sequence_value: 999999,
      };

      // Act
      const counter = new counterModel(counterWithHighSequence);
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter.sequence_value).toBe(999999);
    });

    it('should SUCCEED with negative sequence_value', async () => {
      // Arrange
      const counterWithNegativeSequence = {
        _id: 'test',
        prefix: 'TEST',
        sequence_value: -1,
      };

      // Act
      const counter = new counterModel(counterWithNegativeSequence);
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter.sequence_value).toBe(-1);
    });
  });

  describe('schema constraints', () => {
    it('should enforce unique _id constraint', async () => {
      // Arrange
      const counter1 = new counterModel({
        _id: 'duplicate',
        prefix: 'DUP1',
        sequence_value: 1,
      });
      const counter2 = new counterModel({
        _id: 'duplicate', // Same _id
        prefix: 'DUP2',
        sequence_value: 2,
      });

      // Act
      await counter1.save();

      // Assert
      await expect(counter2.save()).rejects.toThrow();
    });

    it('should allow same prefix for different counters', async () => {
      // Arrange
      const counter1 = new counterModel({
        _id: 'resource1',
        prefix: 'SAME',
        sequence_value: 1,
      });
      const counter2 = new counterModel({
        _id: 'resource2',
        prefix: 'SAME', // Same prefix, different _id
        sequence_value: 2,
      });

      // Act & Assert
      await expect(counter1.save()).resolves.toBeDefined();
      await expect(counter2.save()).resolves.toBeDefined();
    });

    it('should FAIL when prefix is empty string', async () => {
      // Arrange
      const counterWithEmptyPrefix = {
        _id: 'empty',
        prefix: '', // Empty string should be rejected
        sequence_value: 0,
      };

      // Act & Assert
      const counter = new counterModel(counterWithEmptyPrefix);
      await expect(counter.save()).rejects.toThrow();
    });

    it('should handle long prefix strings', async () => {
      // Arrange
      const longPrefix = 'A'.repeat(50); // Very long prefix
      const counterWithLongPrefix = {
        _id: 'long',
        prefix: longPrefix,
        sequence_value: 0,
      };

      // Act
      const counter = new counterModel(counterWithLongPrefix);
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter.prefix).toBe(longPrefix);
    });
  });

  describe('data types', () => {
    it('should handle string _id correctly', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'string-id-with-dashes',
        prefix: 'STR',
        sequence_value: 0,
      });

      // Act
      const savedCounter = await counter.save();

      // Assert
      expect(typeof savedCounter._id).toBe('string');
      expect(savedCounter._id).toBe('string-id-with-dashes');
    });

    it('should handle string prefix with special characters', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'special',
        prefix: 'SUB-2024_V1',
        sequence_value: 0,
      });

      // Act
      const savedCounter = await counter.save();

      // Assert
      expect(typeof savedCounter.prefix).toBe('string');
      expect(savedCounter.prefix).toBe('SUB-2024_V1');
    });

    it('should handle number sequence_value correctly', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'number',
        prefix: 'NUM',
        sequence_value: 12345,
      });

      // Act
      const savedCounter = await counter.save();

      // Assert
      expect(typeof savedCounter.sequence_value).toBe('number');
      expect(savedCounter.sequence_value).toBe(12345);
    });

    it('should handle zero sequence_value', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'zero',
        prefix: 'ZERO',
        sequence_value: 0,
      });

      // Act
      const savedCounter = await counter.save();

      // Assert
      expect(savedCounter.sequence_value).toBe(0);
    });
  });

  describe('collection configuration', () => {
    it('should use correct collection name', () => {
      // Assert
      expect(counterModel.collection.name).toBe('counters');
    });

    it('should have correct schema structure', () => {
      // Assert
      const paths = counterModel.schema.paths;
      expect(paths).toHaveProperty('_id');
      expect(paths).toHaveProperty('prefix');
      expect(paths).toHaveProperty('sequence_value');
    });

    it('should have required fields marked correctly', () => {
      // Assert
      const paths = counterModel.schema.paths;
      expect(paths._id.isRequired).toBe(true);
      expect(paths.prefix.isRequired).toBe(true);
      expect(paths.sequence_value.isRequired).toBe(true);
    });

    it('should have correct default value for sequence_value', () => {
      // Assert
      const sequenceValuePath = counterModel.schema.paths.sequence_value as any;
      expect(sequenceValuePath.defaultValue).toBe(0);
    });
  });

  describe('document operations', () => {
    it('should support findById with string _id', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'findable',
        prefix: 'FIND',
        sequence_value: 100,
      });
      await counter.save();

      // Act
      const foundCounter = await counterModel.findById('findable');

      // Assert
      expect(foundCounter).toBeDefined();
      expect(foundCounter?._id).toBe('findable');
      expect(foundCounter?.prefix).toBe('FIND');
      expect(foundCounter?.sequence_value).toBe(100);
    });

    it('should support update operations', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'updatable',
        prefix: 'OLD',
        sequence_value: 5,
      });
      await counter.save();

      // Act
      const updatedCounter = await counterModel.findByIdAndUpdate(
        'updatable',
        { $set: { prefix: 'NEW' }, $inc: { sequence_value: 1 } },
        { new: true }
      );

      // Assert
      expect(updatedCounter).toBeDefined();
      expect(updatedCounter?.prefix).toBe('NEW');
      expect(updatedCounter?.sequence_value).toBe(6);
    });

    it('should support atomic findOneAndUpdate operations', async () => {
      // Arrange
      const counter = new counterModel({
        _id: 'atomic',
        prefix: 'ATOM',
        sequence_value: 0,
      });
      await counter.save();

      // Act
      const updatedCounter = await counterModel.findOneAndUpdate(
        { _id: 'atomic' },
        { $inc: { sequence_value: 1 } },
        { new: true, returnDocument: 'after' }
      );

      // Assert
      expect(updatedCounter).toBeDefined();
      expect(updatedCounter?.sequence_value).toBe(1);
    });
  });
});
