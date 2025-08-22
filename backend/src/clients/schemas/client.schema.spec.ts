import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import { Client, ClientSchema, ClientDocument } from './client.schema';

describe('Client Schema - RootStock Multi-Tenant System', () => {
  let moduleRef: TestingModule;
  let clientModel: Model<ClientDocument>;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
      ],
    }).compile();

    clientModel = moduleRef.get<Model<ClientDocument>>(getModelToken(Client.name));
  });

  afterAll(async () => {
    await moduleRef?.close();
    await mongoServer?.stop();
  });

  beforeEach(async () => {
    await clientModel.deleteMany({});
  });

  describe('RootStock Business Client Types', () => {
    it('should create independent client for direct orchard management', async () => {
      // Arrange: Independent grower client (no subsidiary parent)
      const independentClient = new clientModel({
        recordId: 'CLI0001',
        name: 'Valley Vista Orchards',
        isActive: true,
        isDeleted: false,
      });

      // Act: Save independent client
      const savedClient = await independentClient.save();

      // Assert: Independent client configured for direct management
      expect(savedClient.recordId).toBe('CLI0001');
      expect(savedClient.name).toBe('Valley Vista Orchards');
      expect(savedClient.subsidiaryId).toBeUndefined(); // No parent subsidiary
      expect(savedClient.isActive).toBe(true);
      expect(savedClient.isDeleted).toBe(false);
    });

    it('should create subsidiary-managed client for enterprise orchard operations', async () => {
      // Arrange: Business scenario - client managed by consulting subsidiary
      const subsidiaryId = new Types.ObjectId();
      const managedClient = new clientModel({
        recordId: 'CLI0002',
        name: 'Premium Apple Cooperative',
        subsidiaryId: subsidiaryId,
        isActive: true,
      });

      // Act: Save subsidiary-managed client
      const savedClient = await managedClient.save();

      // Assert: Client linked to subsidiary for management hierarchy
      expect(savedClient.subsidiaryId).toEqual(subsidiaryId);
      expect(savedClient.subsidiaryId).toBeInstanceOf(Types.ObjectId);
      expect(savedClient.name).toBe('Premium Apple Cooperative');
    });

    it('should create small family farm client with minimal data requirements', async () => {
      // Arrange: Business scenario - small operation with basic needs
      const familyFarm = new clientModel({
        recordId: 'CLI0003',
        name: 'Smith Family Orchard',
      });

      // Act: Save family farm client
      const savedClient = await familyFarm.save();

      // Assert: Basic client setup with business defaults
      expect(savedClient.isActive).toBe(true); // Default active for new clients
      expect(savedClient.isDeleted).toBe(false); // Default not deleted
      expect(savedClient.name).toBe('Smith Family Orchard');
      expect(savedClient.recordId).toBe('CLI0003');
    });
  });

  describe('Multi-Tenant Data Organization', () => {
    it('should support multiple clients under single subsidiary for consulting business', async () => {
      // Arrange: Business scenario - consulting company managing multiple clients
      const consultingSubsidiaryId = new Types.ObjectId();
      const clients = [
        {
          recordId: 'CLI0004',
          name: 'North Valley Growers',
          subsidiaryId: consultingSubsidiaryId,
        },
        {
          recordId: 'CLI0005',
          name: 'South Ridge Orchards',
          subsidiaryId: consultingSubsidiaryId,
        },
        {
          recordId: 'CLI0006',
          name: 'Mountain View Farms',
          subsidiaryId: consultingSubsidiaryId,
        },
      ];

      // Act: Create multiple clients under same subsidiary
      const savedClients = await clientModel.insertMany(clients);

      // Assert: All clients linked to same subsidiary for business organization
      expect(savedClients).toHaveLength(3);
      savedClients.forEach(client => {
        expect(client.subsidiaryId).toEqual(consultingSubsidiaryId);
        expect(client.isActive).toBe(true);
      });
    });

    it('should maintain client independence for different business models', async () => {
      // Arrange: Mixed business scenario - independent and managed clients
      const subsidiaryA = new Types.ObjectId();
      const subsidiaryB = new Types.ObjectId();
      
      const mixedClients = [
        { recordId: 'CLI0007', name: 'Independent Orchard', subsidiaryId: undefined },
        { recordId: 'CLI0008', name: 'Subsidiary A Client', subsidiaryId: subsidiaryA },
        { recordId: 'CLI0009', name: 'Subsidiary B Client', subsidiaryId: subsidiaryB },
      ];

      // Act: Create clients with different management structures
      const savedClients = await clientModel.insertMany(mixedClients);

      // Assert: Each client maintains proper business relationship
      expect(savedClients[0].subsidiaryId).toBeUndefined(); // Independent
      expect(savedClients[1].subsidiaryId).toEqual(subsidiaryA); // Managed by A
      expect(savedClients[2].subsidiaryId).toEqual(subsidiaryB); // Managed by B
    });

    it('should support client portfolio management for enterprise scenarios', async () => {
      // Arrange: Enterprise subsidiary managing diverse client portfolio
      const enterpriseSubsidiaryId = new Types.ObjectId();
      const portfolioClients = [
        { recordId: 'CLI0010', name: 'Organic Specialists Inc', subsidiaryId: enterpriseSubsidiaryId },
        { recordId: 'CLI0011', name: 'Traditional Growers LLC', subsidiaryId: enterpriseSubsidiaryId },
        { recordId: 'CLI0012', name: 'Sustainable Farms Co-op', subsidiaryId: enterpriseSubsidiaryId },
        { recordId: 'CLI0013', name: 'Heritage Orchards Ltd', subsidiaryId: enterpriseSubsidiaryId },
      ];

      // Act: Create enterprise client portfolio
      const portfolio = await clientModel.insertMany(portfolioClients);

      // Assert: Portfolio structure maintained for business operations
      expect(portfolio).toHaveLength(4);
      const uniqueSubsidiaries = new Set(portfolio.map(c => c.subsidiaryId?.toString()));
      expect(uniqueSubsidiaries.size).toBe(1); // All under same subsidiary
    });
  });

  describe('RootStock Entity State Management', () => {
    it('should default to active and not-deleted for new business clients', async () => {
      // Arrange: New client without explicit status settings
      const newClient = new clientModel({
        recordId: 'CLI0014',
        name: 'Default Status Client',
      });

      // Act: Save new client with default status
      const savedClient = await newClient.save();

      // Assert: Defaults to active business state
      expect(savedClient.isActive).toBe(true);
      expect(savedClient.isDeleted).toBe(false);
      expect((savedClient as any).createdAt).toBeDefined(); // Timestamps enabled
      expect((savedClient as any).updatedAt).toBeDefined();
    });

    it('should support client deactivation for seasonal business operations', async () => {
      // Arrange: Active client during growing season
      const seasonalClient = new clientModel({
        recordId: 'CLI0015',
        name: 'Seasonal Operations Farm',
        isActive: true,
      });
      await seasonalClient.save();

      // Act: Deactivate client for off-season (business workflow)
      const deactivatedClient = await clientModel.findByIdAndUpdate(
        seasonalClient._id,
        { isActive: false },
        { new: true }
      );

      // Assert: Client deactivated while preserving data for next season
      expect(deactivatedClient?.isActive).toBe(false);
      expect(deactivatedClient?.isDeleted).toBe(false); // Still accessible for reporting
    });

    it('should support soft deletion for business continuity and compliance', async () => {
      // Arrange: Client that will cease operations but needs historical preservation
      const clientToDelete = new clientModel({
        recordId: 'CLI0016',
        name: 'Historical Operations LLC',
        isActive: true,
      });
      await clientToDelete.save();

      // Act: Soft delete client (ClientsService pattern)
      const deletedClient = await clientModel.findByIdAndUpdate(
        clientToDelete._id,
        { isDeleted: true, isActive: false },
        { new: true }
      );

      // Assert: Client soft-deleted with preserved historical data
      expect(deletedClient?.isDeleted).toBe(true);
      expect(deletedClient?.isActive).toBe(false);
      expect(deletedClient?.name).toBe('Historical Operations LLC'); // Data preserved
    });

    it('should support client reactivation for returning business relationships', async () => {
      // Arrange: Previously inactive client returning to operations
      const returningClient = new clientModel({
        recordId: 'CLI0017',
        name: 'Returning Grower Farm',
        isActive: false, // Previously inactive
      });
      await returningClient.save();

      // Act: Reactivate client for new growing season
      const reactivatedClient = await clientModel.findByIdAndUpdate(
        returningClient._id,
        { isActive: true },
        { new: true }
      );

      // Assert: Client reactivated for business operations
      expect(reactivatedClient?.isActive).toBe(true);
      expect(reactivatedClient?.isDeleted).toBe(false);
    });
  });

  describe('Business Rule Enforcement', () => {
    it('should enforce unique recordId constraint for business identification', async () => {
      // Arrange: Create client with specific recordId
      const firstClient = new clientModel({
        recordId: 'CLI_UNIQUE',
        name: 'First Client',
      });
      await firstClient.save();

      // Act & Assert: Attempt to create another client with same recordId should fail
      const duplicateClient = new clientModel({
        recordId: 'CLI_UNIQUE', // Same business ID
        name: 'Duplicate Client',
      });

      await expect(duplicateClient.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should allow same recordId for deleted clients (partial index behavior)', async () => {
      // Arrange: Create and delete a client
      const originalClient = new clientModel({
        recordId: 'CLI_REUSABLE',
        name: 'Original Client',
        isDeleted: true, // Deleted client
      });
      await originalClient.save();

      // Act: Create new active client with same recordId
      const newClient = new clientModel({
        recordId: 'CLI_REUSABLE', // Same recordId as deleted client
        name: 'New Client',
        isActive: true,
        isDeleted: false, // Active client
      });

      // Assert: Should succeed due to partial index on isDeleted: false
      const savedClient = await newClient.save();
      expect(savedClient.recordId).toBe('CLI_REUSABLE');
      expect(savedClient.isDeleted).toBe(false);
    });

    it('should require all essential business fields', async () => {
      // Arrange: Client missing required business fields
      const incompleteClient = new clientModel({
        // Missing recordId and name
        isActive: true,
      });

      // Act & Assert: Should fail validation for missing required fields
      await expect(incompleteClient.save()).rejects.toThrow(/validation failed/);
    });

    it('should reject empty business identifiers', async () => {
      // Arrange: Client with empty business fields
      const emptyFieldsClient = new clientModel({
        recordId: '', // Empty recordId
        name: '', // Empty name
      });

      // Act & Assert: Should fail validation for empty required fields
      await expect(emptyFieldsClient.save()).rejects.toThrow();
    });

    it('should validate subsidiary ObjectId format for relationship integrity', async () => {
      // Arrange: Client with invalid subsidiary ObjectId
      const invalidSubsidiaryClient = new clientModel({
        recordId: 'CLI0018',
        name: 'Invalid Subsidiary Client',
        subsidiaryId: 'invalid-objectid-format' as any,
      });

      // Act & Assert: Should fail ObjectId validation
      await expect(invalidSubsidiaryClient.save()).rejects.toThrow();
    });
  });

  describe('RootStock Integration Scenarios', () => {
    it('should support client business evolution and growth', async () => {
      // Arrange: Start with small independent client
      const growingClient = new clientModel({
        recordId: 'CLI0019',
        name: 'Growing Farm Operations',
        subsidiaryId: undefined, // Start independent
      });
      await growingClient.save();

      // Act: Client grows and joins subsidiary for management services
      const subsidiaryId = new Types.ObjectId();
      const evolvedClient = await clientModel.findByIdAndUpdate(
        growingClient._id,
        {
          name: 'Growing Farm Operations - Premium',
          subsidiaryId: subsidiaryId, // Now managed by subsidiary
        },
        { new: true }
      );

      // Assert: Client evolved to support business growth
      expect(evolvedClient?.name).toBe('Growing Farm Operations - Premium');
      expect(evolvedClient?.subsidiaryId).toEqual(subsidiaryId);
    });

    it('should maintain referential integrity with recordId for user assignments', async () => {
      // Arrange: Client that will be referenced by users and orchards
      const referencedClient = new clientModel({
        recordId: 'CLI0020',
        name: 'Multi-Reference Client',
        isActive: true,
      });

      // Act: Save client for entity references
      const savedClient = await referencedClient.save();

      // Assert: Client has stable IDs for relationships
      expect(savedClient._id).toBeDefined();
      expect(savedClient.recordId).toBe('CLI0020'); // Business key for display
      expect(typeof savedClient._id.toString()).toBe('string'); // MongoDB ObjectId for relations
    });

    it('should support international business names for global operations', async () => {
      // Arrange: International clients for global RootStock deployment
      const internationalClients = [
        { recordId: 'CLI0021', name: 'Café des Pommes SARL' }, // French
        { recordId: 'CLI0022', name: 'Müller Obstbau GmbH' }, // German
        { recordId: 'CLI0023', name: 'Naranjas López S.A.' }, // Spanish
        { recordId: 'CLI0024', name: 'São Paulo Frutas Ltda' }, // Portuguese
      ];

      // Act: Create international clients
      const savedClients = await clientModel.insertMany(internationalClients);

      // Assert: International characters preserved for global business
      expect(savedClients[0].name).toBe('Café des Pommes SARL');
      expect(savedClients[1].name).toBe('Müller Obstbau GmbH');
      expect(savedClients[2].name).toBe('Naranjas López S.A.');
      expect(savedClients[3].name).toBe('São Paulo Frutas Ltda');
    });

    it('should support bulk client operations for enterprise onboarding', async () => {
      // Arrange: Enterprise scenario - onboarding multiple clients simultaneously
      const subsidiaryId = new Types.ObjectId();
      const bulkClients = Array.from({ length: 10 }, (_, i) => ({
        recordId: `CLI_BULK_${i.toString().padStart(3, '0')}`,
        name: `Enterprise Client ${i + 1}`,
        subsidiaryId: subsidiaryId,
        isActive: true,
      }));

      // Act: Bulk create clients for enterprise onboarding
      const onboardedClients = await clientModel.insertMany(bulkClients);

      // Assert: Bulk operations support enterprise client management
      expect(onboardedClients).toHaveLength(10);
      onboardedClients.forEach((client, index) => {
        expect(client.recordId).toBe(`CLI_BULK_${index.toString().padStart(3, '0')}`);
        expect(client.subsidiaryId).toEqual(subsidiaryId);
        expect(client.isActive).toBe(true);
      });
    });
  });

  describe('Database Query Performance and Integration', () => {
    it('should support efficient subsidiary-based client queries for business operations', async () => {
      // Arrange: Multiple subsidiaries with their respective clients
      const subsidiaryA = new Types.ObjectId();
      const subsidiaryB = new Types.ObjectId();
      
      await clientModel.insertMany([
        { recordId: 'CLI0025', name: 'SubA Client 1', subsidiaryId: subsidiaryA, isActive: true },
        { recordId: 'CLI0026', name: 'SubA Client 2', subsidiaryId: subsidiaryA, isActive: true },
        { recordId: 'CLI0027', name: 'SubB Client 1', subsidiaryId: subsidiaryB, isActive: true },
        { recordId: 'CLI0028', name: 'Independent Client', isActive: true }, // No subsidiary
      ]);

      // Act: Query clients by subsidiary (typical ClientsService pattern)
      const subsidiaryAClients = await clientModel.find({
        subsidiaryId: subsidiaryA,
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns only clients for specific subsidiary
      expect(subsidiaryAClients).toHaveLength(2);
      subsidiaryAClients.forEach(client => {
        expect(client.subsidiaryId).toEqual(subsidiaryA);
        expect(client.name).toMatch(/SubA Client/);
      });
    });

    it('should support the ClientsService query patterns for multi-tenant access', async () => {
      // Arrange: Set up test clients as ClientsService would query them
      await clientModel.create([
        {
          recordId: 'CLI0029',
          name: 'Query Test Active',
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'CLI0030',
          name: 'Query Test Inactive',
          isActive: false, // Inactive
          isDeleted: false,
        },
        {
          recordId: 'CLI0031',
          name: 'Query Test Deleted',
          isActive: false,
          isDeleted: true, // Soft deleted
        },
      ]);

      // Act: Query active clients (typical ClientsService pattern)
      const activeClients = await clientModel.find({
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns only active, non-deleted clients
      expect(activeClients).toHaveLength(1);
      expect(activeClients[0].name).toBe('Query Test Active');
      expect(activeClients[0].isActive).toBe(true);
      expect(activeClients[0].isDeleted).toBe(false);
    });

    it('should maintain proper MongoDB collection structure for ClientsService integration', () => {
      // Assert: Verify schema structure matches service expectations
      expect(clientModel.collection.name).toBe('clients');
      
      const paths = clientModel.schema.paths;
      expect(paths).toHaveProperty('recordId');      // Business identifier
      expect(paths).toHaveProperty('name');          // Business name
      expect(paths).toHaveProperty('subsidiaryId');  // Parent relationship (optional)
      expect(paths).toHaveProperty('isActive');      // Business state
      expect(paths).toHaveProperty('isDeleted');     // Soft delete state
      expect(paths).toHaveProperty('createdAt');     // Audit trail (from timestamps: true)
      expect(paths).toHaveProperty('updatedAt');     // Audit trail (from timestamps: true)
    });
  });
});
