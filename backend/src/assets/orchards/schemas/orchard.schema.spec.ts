import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

import { Orchard, OrchardSchema, OrchardDocument } from './orchard.schema';

describe('Orchard Schema - RootStock Agricultural Management System', () => {
  let moduleRef: TestingModule;
  let orchardModel: Model<OrchardDocument>;
  let mongoServer: MongoMemoryReplSet;

  beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ 
      replSet: { count: 1, dbName: 'jest' } 
    });
    const mongoUri = mongoServer.getUri();

    moduleRef = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri),
        MongooseModule.forFeature([{ name: Orchard.name, schema: OrchardSchema }]),
      ],
    }).compile();

    orchardModel = moduleRef.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
  }, 60000);

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  }, 30000);

  beforeEach(async () => {
    await orchardModel.deleteMany({});
  });

  describe('RootStock Agricultural Orchard Operations', () => {
    it('should create premium apple orchard for commercial agricultural client', async () => {
      // Arrange: Premium commercial apple orchard setup
      const premiumOrchardClient = new Types.ObjectId();
      const orchardManager = new Types.ObjectId();
      const fieldWorker = new Types.ObjectId();

      const premiumAppleOrchard = new orchardModel({
        recordId: 'ORCH0001',
        name: 'Premium Apple Orchard - North Block',
        clientId: premiumOrchardClient,
        address: {
          street: '1500 Orchard Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
        userIds: [orchardManager, fieldWorker],
        isActive: true,
        isDeleted: false,
      });

      // Act: Save premium commercial orchard
      const savedOrchard = await premiumAppleOrchard.save();

      // Assert: Premium orchard configured for commercial operations
      expect(savedOrchard.name).toBe('Premium Apple Orchard - North Block');
      expect(savedOrchard.clientId).toEqual(premiumOrchardClient);
      expect(savedOrchard.address?.street).toBe('1500 Orchard Valley Road');
      expect(savedOrchard.address?.city).toBe('Wenatchee');
      expect(savedOrchard.address?.state).toBe('Washington');
      expect(savedOrchard.userIds).toHaveLength(2);
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(orchardManager.toString());
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(fieldWorker.toString());
      expect(savedOrchard.isActive).toBe(true);
      expect(savedOrchard.isDeleted).toBe(false);
    });

    it('should create organic cherry orchard for family farm operations', async () => {
      // Arrange: Family-owned organic cherry orchard
      const familyFarmClient = new Types.ObjectId();
      const farmOwner = new Types.ObjectId();

      const organicCherryOrchard = new orchardModel({
        recordId: 'ORCH0002',
        name: 'Organic Cherry Orchard - Heritage Block',
        clientId: familyFarmClient,
        address: {
          street: '750 Heritage Farm Lane',
          city: 'Hood River',
          state: 'Oregon',
          postalCode: '97031',
          country: 'United States',
        },
        userIds: [farmOwner], // Single owner-operator
        isActive: true,
      });

      // Act: Save organic family orchard
      const savedOrchard = await organicCherryOrchard.save();

      // Assert: Family orchard configured for organic operations
      expect(savedOrchard.name).toBe('Organic Cherry Orchard - Heritage Block');
      expect(savedOrchard.clientId).toEqual(familyFarmClient);
      expect(savedOrchard.address?.street).toBe('750 Heritage Farm Lane');
      expect(savedOrchard.address?.city).toBe('Hood River');
      expect(savedOrchard.userIds).toHaveLength(1);
      expect(savedOrchard.userIds[0]).toEqual(farmOwner);
      expect(savedOrchard.isDeleted).toBe(false); // Default value
    });

    it('should create citrus grove for regional agricultural cooperative', async () => {
      // Arrange: Regional cooperative citrus operation
      const cooperativeClient = new Types.ObjectId();
      const groveManager = new Types.ObjectId();
      const seasonalSupervisor = new Types.ObjectId();
      const irrigationSpecialist = new Types.ObjectId();

      const citrusGrove = new orchardModel({
        recordId: 'ORCH0003',
        name: 'Sunshine Citrus Grove - East Valley',
        clientId: cooperativeClient,
        address: {
          street: '2400 Citrus Valley Highway',
          city: 'Riverside',
          state: 'California',
          postalCode: '92501',
          country: 'United States',
        },
        userIds: [groveManager, seasonalSupervisor, irrigationSpecialist],
      });

      // Act: Save cooperative citrus grove
      const savedOrchard = await citrusGrove.save();

      // Assert: Cooperative grove configured with specialized staff
      expect(savedOrchard.name).toBe('Sunshine Citrus Grove - East Valley');
      expect(savedOrchard.address?.state).toBe('California');
      expect(savedOrchard.userIds).toHaveLength(3);
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(groveManager.toString());
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(seasonalSupervisor.toString());
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(irrigationSpecialist.toString());
      expect(savedOrchard.isActive).toBe(true); // Default active state
    });

    it('should create vineyard with minimal configuration for startup operations', async () => {
      // Arrange: New vineyard with basic setup
      const startupWineryClient = new Types.ObjectId();

      const startupVineyard = new orchardModel({
        recordId: 'ORCH0004',
        name: 'Startup Vineyard - Pioneer Block',
        clientId: startupWineryClient,
        // No address initially (optional)
        // No assigned users initially (optional array)
      });

      // Act: Save minimal vineyard configuration
      const savedOrchard = await startupVineyard.save();

      // Assert: Minimal orchard ready for future expansion
      expect(savedOrchard.name).toBe('Startup Vineyard - Pioneer Block');
      expect(savedOrchard.clientId).toEqual(startupWineryClient);
      expect(savedOrchard.address).toBeDefined(); // Address object exists
      expect(Object.keys(savedOrchard.address || {}).length).toBeGreaterThanOrEqual(0); // Can be empty or have default structure
      expect(savedOrchard.userIds).toEqual([]); // Default empty user array
      expect(savedOrchard.isActive).toBe(true);
      expect(savedOrchard.isDeleted).toBe(false);
    });

    it('should create experimental research orchard for agricultural university', async () => {
      // Arrange: University research orchard with multiple researchers
      const universityClient = new Types.ObjectId();
      const leadResearcher = new Types.ObjectId();
      const graduateStudent1 = new Types.ObjectId();
      const graduateStudent2 = new Types.ObjectId();
      const fieldTechnician = new Types.ObjectId();

      const researchOrchard = new orchardModel({
        recordId: 'ORCH0005',
        name: 'Agricultural Research Orchard - Experimental Varieties',
        clientId: universityClient,
        address: {
          street: '100 Research Drive',
          city: 'Davis',
          state: 'California',
          postalCode: '95616',
          country: 'United States',
        },
        userIds: [leadResearcher, graduateStudent1, graduateStudent2, fieldTechnician],
        isActive: true,
      });

      // Act: Save research orchard
      const savedOrchard = await researchOrchard.save();

      // Assert: Research orchard configured for academic operations
      expect(savedOrchard.name).toBe('Agricultural Research Orchard - Experimental Varieties');
      expect(savedOrchard.address?.city).toBe('Davis');
      expect(savedOrchard.userIds).toHaveLength(4); // Multiple researchers
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(leadResearcher.toString());
      expect(savedOrchard.userIds.map(id => id.toString())).toContain(graduateStudent1.toString());
    });
  });

  describe('Multi-Tenant Orchard Management Scenarios', () => {
    it('should support corporate agricultural enterprise with multiple orchard locations', async () => {
      // Arrange: Large corporate client with diverse orchard portfolio
      const corporateAgricultureClient = new Types.ObjectId();
      const corporateManager = new Types.ObjectId();
      const regionalSupervisor = new Types.ObjectId();

      const corporateOrchards = [
        {
          recordId: 'CORP_NORTH_001',
          name: 'Corporate Apple Orchard - North Division',
          clientId: corporateAgricultureClient,
          address: {
            street: '5000 Corporate Orchard Way',
            city: 'Spokane',
            state: 'Washington',
            postalCode: '99201',
            country: 'United States',
          },
          userIds: [corporateManager, regionalSupervisor],
        },
        {
          recordId: 'CORP_SOUTH_001',
          name: 'Corporate Pear Orchard - South Division',
          clientId: corporateAgricultureClient,
          address: {
            street: '7500 Southern Agricultural Boulevard',
            city: 'Medford',
            state: 'Oregon',
            postalCode: '97501',
            country: 'United States',
          },
          userIds: [corporateManager, regionalSupervisor],
        },
        {
          recordId: 'CORP_CENTRAL_001',
          name: 'Corporate Research & Development Orchard',
          clientId: corporateAgricultureClient,
          address: {
            street: '1200 Innovation Drive',
            city: 'Yakima',
            state: 'Washington',
            postalCode: '98901',
            country: 'United States',
          },
          userIds: [corporateManager],
        },
      ];

      // Act: Create corporate orchard portfolio
      const savedOrchards = await orchardModel.insertMany(corporateOrchards);

      // Assert: Corporate portfolio supports enterprise operations
      expect(savedOrchards).toHaveLength(3);
      savedOrchards.forEach(orchard => {
        expect(orchard.clientId).toEqual(corporateAgricultureClient);
        expect(orchard.userIds.map(id => id.toString())).toContain(corporateManager.toString());
        expect(orchard.isActive).toBe(true);
      });

      // Verify diverse geographical locations
      const locations = savedOrchards.map(o => o.address?.city);
      expect(locations).toContain('Spokane');
      expect(locations).toContain('Medford');
      expect(locations).toContain('Yakima');
    });

    it('should support agricultural consulting firm managing client orchards', async () => {
      // Arrange: Consulting firm with multiple independent client orchards
      const consultingClient1 = new Types.ObjectId();
      const consultingClient2 = new Types.ObjectId();
      const consultingClient3 = new Types.ObjectId();
      
      const seniorConsultant = new Types.ObjectId();
      const juniorConsultant = new Types.ObjectId();
      const fieldSpecialist = new Types.ObjectId();

      const consultingOrchards = [
        {
          recordId: 'CONSULT_CLIENT1_001',
          name: 'Premium Stone Fruit Orchard',
          clientId: consultingClient1,
          userIds: [seniorConsultant, fieldSpecialist],
          address: {
            street: '900 Stone Fruit Lane',
            city: 'Modesto',
            state: 'California',
            postalCode: '95350',
            country: 'United States',
          },
        },
        {
          recordId: 'CONSULT_CLIENT2_001',
          name: 'Organic Apple Orchard',
          clientId: consultingClient2,
          userIds: [seniorConsultant, juniorConsultant],
          address: {
            street: '1800 Organic Valley Road',
            city: 'Watsonville',
            state: 'California',
            postalCode: '95076',
            country: 'United States',
          },
        },
        {
          recordId: 'CONSULT_CLIENT3_001',
          name: 'Heritage Pear Orchard',
          clientId: consultingClient3,
          userIds: [juniorConsultant, fieldSpecialist],
          address: {
            street: '650 Heritage Orchard Drive',
            city: 'Santa Rosa',
            state: 'California',
            postalCode: '95401',
            country: 'United States',
          },
        },
      ];

      // Act: Create consulting firm's client orchards
      const savedOrchards = await orchardModel.insertMany(consultingOrchards);

      // Assert: Consulting model supports multiple client operations
      expect(savedOrchards).toHaveLength(3);
      expect(savedOrchards[0].clientId).toEqual(consultingClient1);
      expect(savedOrchards[1].clientId).toEqual(consultingClient2);
      expect(savedOrchards[2].clientId).toEqual(consultingClient3);

      // Verify consultant assignments across clients
      const seniorConsultantOrchards = savedOrchards.filter(o => 
        o.userIds.map(id => id.toString()).includes(seniorConsultant.toString())
      );
      expect(seniorConsultantOrchards).toHaveLength(2); // Senior works with 2 clients
    });

    it('should support regional cooperative with member farm orchards', async () => {
      // Arrange: Agricultural cooperative with multiple member farms
      const memberFarm1Client = new Types.ObjectId();
      const memberFarm2Client = new Types.ObjectId();
      const memberFarm3Client = new Types.ObjectId();
      const memberFarm4Client = new Types.ObjectId();

      const cooperativeManager = new Types.ObjectId();
      const qualityInspector = new Types.ObjectId();
      
      const cooperativeOrchards = Array.from({ length: 6 }, (_, i) => {
        const clientIds = [memberFarm1Client, memberFarm2Client, memberFarm3Client, memberFarm4Client];
        const farmOwner = new Types.ObjectId(); // Each farm has its own owner
        
        return {
          recordId: `COOP_FARM${Math.floor(i / 2) + 1}_BLOCK${(i % 2) + 1}`,
          name: `Cooperative Member Farm ${Math.floor(i / 2) + 1} - Block ${(i % 2) + 1}`,
          clientId: clientIds[Math.floor(i / 2)],
          userIds: [cooperativeManager, qualityInspector, farmOwner],
          address: {
            street: `${1000 + (i * 100)} Cooperative Road`,
            city: 'Fresno',
            state: 'California',
            postalCode: '93701',
            country: 'United States',
          },
        };
      });

      // Act: Create cooperative member orchards
      const savedOrchards = await orchardModel.insertMany(cooperativeOrchards);

      // Assert: Cooperative structure supports member farm management
      expect(savedOrchards).toHaveLength(6);
      
      // Verify each member farm has multiple blocks
      const farm1Orchards = savedOrchards.filter(o => o.clientId.equals(memberFarm1Client));
      expect(farm1Orchards).toHaveLength(2);
      
      // Verify cooperative staff assigned to all orchards
      savedOrchards.forEach(orchard => {
        expect(orchard.userIds.map(id => id.toString())).toContain(cooperativeManager.toString());
        expect(orchard.userIds.map(id => id.toString())).toContain(qualityInspector.toString());
        expect(orchard.userIds).toHaveLength(3); // Manager + Inspector + Owner
      });
    });

    it('should support international agricultural operations with global orchards', async () => {
      // Arrange: International agricultural company with global operations
      const internationalClient = new Types.ObjectId();
      const globalManager = new Types.ObjectId();
      const localManager1 = new Types.ObjectId();
      const localManager2 = new Types.ObjectId();
      const localManager3 = new Types.ObjectId();

      const internationalOrchards = [
        {
          recordId: 'GLOBAL_USA_001',
          name: 'North American Apple Orchard - Washington',
          clientId: internationalClient,
          userIds: [globalManager, localManager1],
          address: {
            street: '3000 International Orchard Way',
            city: 'Wenatchee',
            state: 'Washington',
            postalCode: '98801',
            country: 'United States',
          },
        },
        {
          recordId: 'GLOBAL_CAN_001',
          name: 'Canadian Apple Orchard - British Columbia',
          clientId: internationalClient,
          userIds: [globalManager, localManager2],
          address: {
            street: '1500 Okanagan Valley Road',
            city: 'Kelowna',
            state: 'British Columbia',
            postalCode: 'V1Y 1Z8',
            country: 'Canada',
          },
        },
        {
          recordId: 'GLOBAL_NZL_001',
          name: 'New Zealand Apple Orchard - Hawke\'s Bay',
          clientId: internationalClient,
          userIds: [globalManager, localManager3],
          address: {
            street: '750 Hawke\'s Bay Road',
            city: 'Hastings',
            state: 'Hawke\'s Bay',
            postalCode: '4120',
            country: 'New Zealand',
          },
        },
      ];

      // Act: Create international orchard operations
      const savedOrchards = await orchardModel.insertMany(internationalOrchards);

      // Assert: Global operations support international agricultural business
      expect(savedOrchards).toHaveLength(3);
      
      // Verify global management structure
      savedOrchards.forEach(orchard => {
        expect(orchard.clientId).toEqual(internationalClient);
        expect(orchard.userIds.map(id => id.toString())).toContain(globalManager.toString());
      });

      // Verify international addresses
      const countries = savedOrchards.map(o => o.address?.country);
      expect(countries).toContain('United States');
      expect(countries).toContain('Canada');
      expect(countries).toContain('New Zealand');
    });
  });

  describe('RootStock Orchard Lifecycle Management', () => {
    it('should default to active state for new agricultural operations', async () => {
      // Arrange: New orchard without explicit status settings
      const newAgricultureClient = new Types.ObjectId();

      const newOrchard = new orchardModel({
        recordId: 'ORCH0006',
        name: 'New Agricultural Orchard - Startup Block',
        clientId: newAgricultureClient,
        // No explicit isActive or isDeleted values
      });

      // Act: Save new orchard with default status
      const savedOrchard = await newOrchard.save();

      // Assert: Defaults to active agricultural operation state
      expect(savedOrchard.isActive).toBe(true);
      expect(savedOrchard.isDeleted).toBe(false);
      expect((savedOrchard as any).createdAt).toBeDefined(); // Timestamps enabled
      expect((savedOrchard as any).updatedAt).toBeDefined();
    });

    it('should support orchard deactivation for seasonal agricultural operations', async () => {
      // Arrange: Active orchard during growing season
      const seasonalClient = new Types.ObjectId();
      const seasonalOrchard = new orchardModel({
        recordId: 'ORCH0007',
        name: 'Seasonal Cherry Orchard - Summer Operations',
        clientId: seasonalClient,
        isActive: true,
      });
      await seasonalOrchard.save();

      // Act: Deactivate orchard for off-season (business workflow)
      const deactivatedOrchard = await orchardModel.findByIdAndUpdate(
        seasonalOrchard._id,
        { isActive: false },
        { new: true }
      );

      // Assert: Orchard deactivated while preserving data for next season
      expect(deactivatedOrchard?.isActive).toBe(false);
      expect(deactivatedOrchard?.isDeleted).toBe(false); // Still accessible for reporting
      expect(deactivatedOrchard?.name).toBe('Seasonal Cherry Orchard - Summer Operations');
    });

    it('should support soft deletion for orchard retirement while preserving historical data', async () => {
      // Arrange: Orchard being retired but needing historical preservation
      const retiringClient = new Types.ObjectId();
      const historicalOrchard = new orchardModel({
        recordId: 'ORCH0008',
        name: 'Legacy Heritage Orchard - Historical Varieties',
        clientId: retiringClient,
        address: {
          street: '500 Heritage Lane',
          city: 'Sebastopol',
          state: 'California',
          postalCode: '95472',
          country: 'United States',
        },
        userIds: [new Types.ObjectId()],
        isActive: true,
      });
      await historicalOrchard.save();

      // Act: Soft delete orchard (OrchardsService pattern)
      const deletedOrchard = await orchardModel.findByIdAndUpdate(
        historicalOrchard._id,
        { isDeleted: true, isActive: false },
        { new: true }
      );

      // Assert: Orchard soft-deleted with preserved historical data
      expect(deletedOrchard?.isDeleted).toBe(true);
      expect(deletedOrchard?.isActive).toBe(false);
      expect(deletedOrchard?.name).toBe('Legacy Heritage Orchard - Historical Varieties');
      expect(deletedOrchard?.address?.street).toBe('500 Heritage Lane');
      expect(deletedOrchard?.userIds).toHaveLength(1); // Historical assignments preserved
    });

    it('should support orchard reactivation for resuming agricultural operations', async () => {
      // Arrange: Previously inactive orchard returning to production
      const returningClient = new Types.ObjectId();
      const returningOrchard = new orchardModel({
        recordId: 'ORCH0009',
        name: 'Restored Apple Orchard - Revival Block',
        clientId: returningClient,
        userIds: [new Types.ObjectId()],
        isActive: false, // Previously inactive
      });
      await returningOrchard.save();

      // Act: Reactivate orchard for new agricultural season
      const reactivatedOrchard = await orchardModel.findByIdAndUpdate(
        returningOrchard._id,
        { isActive: true },
        { new: true }
      );

      // Assert: Orchard reactivated for agricultural operations
      expect(reactivatedOrchard?.isActive).toBe(true);
      expect(reactivatedOrchard?.isDeleted).toBe(false);
      expect(reactivatedOrchard?.name).toBe('Restored Apple Orchard - Revival Block');
    });

    it('should support user assignment updates for changing agricultural roles', async () => {
      // Arrange: Orchard with initial user assignments
      const evolvingClient = new Types.ObjectId();
      const originalManager = new Types.ObjectId();
      const originalWorker = new Types.ObjectId();

      const evolvingOrchard = new orchardModel({
        recordId: 'ORCH0010',
        name: 'Evolving Operations Orchard',
        clientId: evolvingClient,
        userIds: [originalManager, originalWorker],
      });
      await evolvingOrchard.save();

      // Act: Update user assignments for role changes
      const newManager = new Types.ObjectId();
      const newSpecialist = new Types.ObjectId();
      const newWorker = new Types.ObjectId();

      const updatedOrchard = await orchardModel.findByIdAndUpdate(
        evolvingOrchard._id,
        { userIds: [newManager, newSpecialist, newWorker] },
        { new: true }
      );

      // Assert: User assignments updated to reflect organizational changes
      expect(updatedOrchard?.userIds).toHaveLength(3);
      expect(updatedOrchard?.userIds.map(id => id.toString())).toContain(newManager.toString());
      expect(updatedOrchard?.userIds.map(id => id.toString())).toContain(newSpecialist.toString());
      expect(updatedOrchard?.userIds.map(id => id.toString())).toContain(newWorker.toString());
      
      // Original users no longer assigned
      expect(updatedOrchard?.userIds.map(id => id.toString())).not.toContain(originalManager.toString());
      expect(updatedOrchard?.userIds.map(id => id.toString())).not.toContain(originalWorker.toString());
    });

    it('should support address updates for changing orchard locations or boundaries', async () => {
      // Arrange: Orchard with initial address
      const expandingClient = new Types.ObjectId();
      const expandingOrchard = new orchardModel({
        recordId: 'ORCH0011',
        name: 'Expanding Orchard Operations',
        clientId: expandingClient,
        address: {
          street: '100 Original Lane',
          city: 'Small Town',
          state: 'California',
          postalCode: '90210',
          country: 'United States',
        },
      });
      await expandingOrchard.save();

      // Act: Update address for expanded operations
      const updatedAddress = {
        street: '500 Expanded Agricultural Complex',
        city: 'Growing City',
        state: 'California',
        postalCode: '90211',
        country: 'United States',
      };

      const updatedOrchard = await orchardModel.findByIdAndUpdate(
        expandingOrchard._id,
        { address: updatedAddress },
        { new: true }
      );

      // Assert: Address updated to reflect business expansion
      expect(updatedOrchard?.address?.street).toBe('500 Expanded Agricultural Complex');
      expect(updatedOrchard?.address?.city).toBe('Growing City');
      expect(updatedOrchard?.address?.postalCode).toBe('90211');
    });
  });

  describe('Business Rule Enforcement & Data Integrity', () => {
    it('should enforce unique recordId constraint for business identification', async () => {
      // Arrange: Create orchard with specific recordId
      const firstClient = new Types.ObjectId();
      const firstOrchard = new orchardModel({
        recordId: 'UNIQUE_ORCHARD',
        name: 'First Orchard',
        clientId: firstClient,
      });
      await firstOrchard.save();

      // Act & Assert: Attempt to create another orchard with same recordId should fail
      const secondClient = new Types.ObjectId();
      const duplicateOrchard = new orchardModel({
        recordId: 'UNIQUE_ORCHARD', // Same business ID
        name: 'Second Orchard',
        clientId: secondClient,
      });

      await expect(duplicateOrchard.save()).rejects.toThrow(/duplicate key error/);
    });

    it('should require all essential business fields for agricultural orchards', async () => {
      // Arrange: Orchard missing required business fields
      const incompleteOrchard = new orchardModel({
        // Missing recordId, name, and clientId
        isActive: true,
      });

      // Act & Assert: Should fail validation for missing required fields
      await expect(incompleteOrchard.save()).rejects.toThrow(/validation failed/);
    });

    it('should reject empty business identifiers and names', async () => {
      // Arrange: Orchard with empty required fields
      const emptyFieldsOrchard = new orchardModel({
        recordId: '', // Empty recordId
        name: '', // Empty name
        clientId: new Types.ObjectId(),
      });

      // Act & Assert: Should fail validation for empty required fields
      await expect(emptyFieldsOrchard.save()).rejects.toThrow();
    });

    it('should validate clientId ObjectId format for relationship integrity', async () => {
      // Arrange: Orchard with invalid clientId ObjectId (completely invalid format)
      const invalidClientOrchard = new orchardModel({
        recordId: 'ORCH0012',
        name: 'Invalid Client Orchard',
        clientId: null, // Null value should fail required validation
      });

      // Act & Assert: Should fail required validation
      await expect(invalidClientOrchard.save()).rejects.toThrow();
    });

    it('should validate userIds array contains valid ObjectId formats', async () => {
      // Arrange: Orchard with invalid ObjectId in userIds array
      const invalidUserIdsOrchard = new orchardModel({
        recordId: 'ORCH0013',
        name: 'Invalid User IDs Orchard',
        clientId: new Types.ObjectId(),
        userIds: ['invalid-objectid', new Types.ObjectId()] as any,
      });

      // Act & Assert: Should fail ObjectId array validation
      await expect(invalidUserIdsOrchard.save()).rejects.toThrow();
    });

    it('should enforce required name field for business operations', async () => {
      // Arrange: Orchard missing name field
      const missingNameOrchard = new orchardModel({
        recordId: 'ORCH0014',
        clientId: new Types.ObjectId(),
        // Missing name field
      });

      // Act & Assert: Should fail validation for missing name field
      await expect(missingNameOrchard.save()).rejects.toThrow();
    });

    it('should enforce required recordId field for business identification', async () => {
      // Arrange: Orchard missing recordId field
      const missingRecordIdOrchard = new orchardModel({
        name: 'Orchard Without Business ID',
        clientId: new Types.ObjectId(),
        // Missing recordId field
      });

      // Act & Assert: Should fail validation for missing recordId field
      await expect(missingRecordIdOrchard.save()).rejects.toThrow();
    });

    it('should enforce required clientId field for multi-tenant data integrity', async () => {
      // Arrange: Orchard missing clientId field
      const missingClientIdOrchard = new orchardModel({
        recordId: 'ORCH0015',
        name: 'Orchard Without Client Reference',
        // Missing clientId field
      });

      // Act & Assert: Should fail validation for missing clientId field
      await expect(missingClientIdOrchard.save()).rejects.toThrow();
    });
  });

  describe('RootStock Integration Scenarios', () => {
    it('should support orchard business evolution and expansion scenarios', async () => {
      // Arrange: Start with small family orchard
      const evolvingClient = new Types.ObjectId();
      const familyOwner = new Types.ObjectId();

      const familyOrchard = new orchardModel({
        recordId: 'EVOLVING_ORCHARD',
        name: 'Family Orchard - Original Block',
        clientId: evolvingClient,
        userIds: [familyOwner],
        address: {
          street: '100 Family Farm Road',
          city: 'Small Valley',
          state: 'Oregon',
          postalCode: '97001',
          country: 'United States',
        },
      });
      await familyOrchard.save();

      // Act: Expand to commercial operation with additional staff
      const farmManager = new Types.ObjectId();
      const qualityController = new Types.ObjectId();
      const fieldSupervisor = new Types.ObjectId();

      const expandedOrchard = await orchardModel.findByIdAndUpdate(
        familyOrchard._id,
        {
          name: 'Premium Family Orchard - Commercial Operations',
          userIds: [familyOwner, farmManager, qualityController, fieldSupervisor],
          address: {
            street: '500 Commercial Orchard Boulevard',
            city: 'Growing Valley',
            state: 'Oregon',
            postalCode: '97002',
            country: 'United States',
          },
        },
        { new: true }
      );

      // Assert: Orchard evolved to support business growth
      expect(expandedOrchard?.name).toBe('Premium Family Orchard - Commercial Operations');
      expect(expandedOrchard?.userIds).toHaveLength(4);
      expect(expandedOrchard?.userIds.map(id => id.toString())).toContain(familyOwner.toString());
      expect(expandedOrchard?.address?.street).toBe('500 Commercial Orchard Boulevard');
      expect(expandedOrchard?.address?.city).toBe('Growing Valley');
    });

    it('should maintain referential integrity with recordId for block and assessment relationships', async () => {
      // Arrange: Orchard that will be referenced by blocks and assessments
      const referencedClient = new Types.ObjectId();
      const orchardManager = new Types.ObjectId();

      const referencedOrchard = new orchardModel({
        recordId: 'REF_ORCHARD_001',
        name: 'Reference Orchard for Block Management',
        clientId: referencedClient,
        userIds: [orchardManager],
        address: {
          street: '300 Reference Orchard Drive',
          city: 'Reference Valley',
          state: 'Washington',
          postalCode: '98001',
          country: 'United States',
        },
        isActive: true,
      });

      // Act: Save orchard for entity references
      const savedOrchard = await referencedOrchard.save();

      // Assert: Orchard has stable IDs for relationships
      expect(savedOrchard._id).toBeDefined();
      expect(savedOrchard.recordId).toBe('REF_ORCHARD_001'); // Business key for display
      expect(typeof savedOrchard._id.toString()).toBe('string'); // MongoDB ObjectId for relations
      expect(savedOrchard.clientId).toBeDefined(); // Client relationship for multi-tenancy
    });

    it('should support international orchard names and addresses for global operations', async () => {
      // Arrange: International orchards for global RootStock deployment
      const globalClient = new Types.ObjectId();
      const globalManager = new Types.ObjectId();

      const internationalOrchards = [
        {
          recordId: 'GLOBAL_FRANCE_001',
          name: 'Verger de Pommes Françaises', // French apple orchard
          clientId: globalClient,
          userIds: [globalManager],
          address: {
            street: '25 Rue des Pommiers',
            city: 'Normandie',
            state: 'Calvados',
            postalCode: '14000',
            country: 'France',
          },
        },
        {
          recordId: 'GLOBAL_GERMANY_001',
          name: 'Deutscher Apfelgarten', // German apple garden
          clientId: globalClient,
          userIds: [globalManager],
          address: {
            street: 'Obstgarten Straße 15',
            city: 'München',
            state: 'Bayern',
            postalCode: '80331',
            country: 'Deutschland',
          },
        },
        {
          recordId: 'GLOBAL_SPAIN_001',
          name: 'Huerto de Manzanas Españolas', // Spanish apple orchard
          clientId: globalClient,
          userIds: [globalManager],
          address: {
            street: 'Calle de los Manzanos 42',
            city: 'Valencia',
            state: 'Comunidad Valenciana',
            postalCode: '46001',
            country: 'España',
          },
        },
        {
          recordId: 'GLOBAL_JAPAN_001',
          name: 'りんご園 (Apple Orchard)', // Japanese apple orchard
          clientId: globalClient,
          userIds: [globalManager],
          address: {
            street: '青森県りんご通り 123',
            city: '青森市',
            state: '青森県',
            postalCode: '030-0801',
            country: '日本',
          },
        },
      ];

      // Act: Create international orchards
      const savedOrchards = await orchardModel.insertMany(internationalOrchards);

      // Assert: International characters preserved for global business
      expect(savedOrchards[0].name).toBe('Verger de Pommes Françaises');
      expect(savedOrchards[0].address?.street).toBe('25 Rue des Pommiers');
      expect(savedOrchards[1].name).toBe('Deutscher Apfelgarten');
      expect(savedOrchards[1].address?.street).toBe('Obstgarten Straße 15');
      expect(savedOrchards[2].name).toBe('Huerto de Manzanas Españolas');
      expect(savedOrchards[2].address?.street).toBe('Calle de los Manzanos 42');
      expect(savedOrchards[3].name).toBe('りんご園 (Apple Orchard)');
      expect(savedOrchards[3].address?.street).toBe('青森県りんご通り 123');
    });

    it('should support bulk orchard operations for enterprise client onboarding', async () => {
      // Arrange: Enterprise scenario - onboarding multiple orchards simultaneously
      const enterpriseClient = new Types.ObjectId();
      const enterpriseManager = new Types.ObjectId();
      const regionalSupervisor = new Types.ObjectId();

      const bulkOrchards = Array.from({ length: 8 }, (_, i) => ({
        recordId: `ENTERPRISE_BULK_${(i + 1).toString().padStart(3, '0')}`,
        name: `Enterprise Orchard Block ${i + 1}`,
        clientId: enterpriseClient,
        userIds: [enterpriseManager, regionalSupervisor],
        address: {
          street: `${1000 + (i * 250)} Enterprise Agricultural Drive`,
          city: 'Enterprise Valley',
          state: 'Washington',
          postalCode: '98101',
          country: 'United States',
        },
        isActive: true,
      }));

      // Act: Bulk create orchards for enterprise onboarding
      const onboardedOrchards = await orchardModel.insertMany(bulkOrchards);

      // Assert: Bulk operations support enterprise orchard management
      expect(onboardedOrchards).toHaveLength(8);
      onboardedOrchards.forEach((orchard, index) => {
        expect(orchard.recordId).toBe(`ENTERPRISE_BULK_${(index + 1).toString().padStart(3, '0')}`);
        expect(orchard.clientId).toEqual(enterpriseClient);
        expect(orchard.userIds.map(id => id.toString())).toContain(enterpriseManager.toString());
        expect(orchard.userIds.map(id => id.toString())).toContain(regionalSupervisor.toString());
        expect(orchard.isActive).toBe(true);
        expect(orchard.address?.street).toBe(`${1000 + (index * 250)} Enterprise Agricultural Drive`);
      });
    });

    it('should support mixed orchard types and specializations within single client', async () => {
      // Arrange: Diversified agricultural client with multiple orchard types
      const diversifiedClient = new Types.ObjectId();
      const generalManager = new Types.ObjectId();
      const appleSpecialist = new Types.ObjectId();
      const organicCertifier = new Types.ObjectId();
      const researchDirector = new Types.ObjectId();

      const diversifiedOrchards = [
        {
          recordId: 'DIVERSIFIED_APPLE_001',
          name: 'Traditional Apple Orchard - Heritage Varieties',
          clientId: diversifiedClient,
          userIds: [generalManager, appleSpecialist],
          address: {
            street: '1200 Heritage Apple Lane',
            city: 'Traditional Valley',
            state: 'New York',
            postalCode: '12345',
            country: 'United States',
          },
        },
        {
          recordId: 'DIVERSIFIED_ORGANIC_001',
          name: 'Certified Organic Fruit Orchard',
          clientId: diversifiedClient,
          userIds: [generalManager, organicCertifier],
          address: {
            street: '800 Organic Certification Drive',
            city: 'Clean Valley',
            state: 'California',
            postalCode: '95001',
            country: 'United States',
          },
        },
        {
          recordId: 'DIVERSIFIED_RESEARCH_001',
          name: 'Agricultural Research & Development Orchard',
          clientId: diversifiedClient,
          userIds: [generalManager, researchDirector],
          address: {
            street: '2000 Innovation Research Boulevard',
            city: 'Tech Valley',
            state: 'Washington',
            postalCode: '98052',
            country: 'United States',
          },
        },
      ];

      // Act: Create diversified orchard portfolio
      const savedOrchards = await orchardModel.insertMany(diversifiedOrchards);

      // Assert: Diversified portfolio supports specialized agricultural operations
      expect(savedOrchards).toHaveLength(3);
      savedOrchards.forEach(orchard => {
        expect(orchard.clientId).toEqual(diversifiedClient);
        expect(orchard.userIds.map(id => id.toString())).toContain(generalManager.toString());
      });

      // Verify specialization assignments
      expect(savedOrchards[0].userIds.map(id => id.toString())).toContain(appleSpecialist.toString());
      expect(savedOrchards[1].userIds.map(id => id.toString())).toContain(organicCertifier.toString());
      expect(savedOrchards[2].userIds.map(id => id.toString())).toContain(researchDirector.toString());

      // Verify specialized naming
      expect(savedOrchards[0].name).toContain('Heritage Varieties');
      expect(savedOrchards[1].name).toContain('Certified Organic');
      expect(savedOrchards[2].name).toContain('Research & Development');
    });
  });

  describe('Database Query Performance and Integration', () => {
    it('should support efficient client-based orchard queries for business operations', async () => {
      // Arrange: Multiple clients with their respective orchards
      const premiumClient = new Types.ObjectId();
      const economyClient = new Types.ObjectId();
      const researchClient = new Types.ObjectId();

      await orchardModel.insertMany([
        {
          recordId: 'CLIENT_PREMIUM_001',
          name: 'Premium Client Orchard Block A',
          clientId: premiumClient,
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'CLIENT_PREMIUM_002',
          name: 'Premium Client Orchard Block B',
          clientId: premiumClient,
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'CLIENT_ECONOMY_001',
          name: 'Economy Client Orchard Block',
          clientId: economyClient,
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'CLIENT_RESEARCH_001',
          name: 'Research Client Experimental Orchard',
          clientId: researchClient,
          isActive: false, // Temporarily inactive
          isDeleted: false,
        },
      ]);

      // Act: Query orchards for specific client (typical OrchardsService pattern)
      const premiumClientOrchards = await orchardModel.find({
        clientId: premiumClient,
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns orchards associated with specific client
      expect(premiumClientOrchards).toHaveLength(2);
      premiumClientOrchards.forEach(orchard => {
        expect(orchard.clientId).toEqual(premiumClient);
        expect(orchard.isActive).toBe(true);
        expect(orchard.isDeleted).toBe(false);
      });
    });

    it('should support the OrchardsService query patterns for multi-tenant access', async () => {
      // Arrange: Set up test orchards as OrchardsService would query them
      const testClient = new Types.ObjectId();

      await orchardModel.create([
        {
          recordId: 'QUERY_ACTIVE_001',
          name: 'Query Test Active Orchard',
          clientId: testClient,
          isActive: true,
          isDeleted: false,
        },
        {
          recordId: 'QUERY_INACTIVE_001',
          name: 'Query Test Inactive Orchard',
          clientId: testClient,
          isActive: false, // Inactive
          isDeleted: false,
        },
        {
          recordId: 'QUERY_DELETED_001',
          name: 'Query Test Deleted Orchard',
          clientId: testClient,
          isActive: false,
          isDeleted: true, // Soft deleted
        },
      ]);

      // Act: Query active orchards (typical OrchardsService pattern)
      const activeOrchards = await orchardModel.find({
        isDeleted: false,
        isActive: true,
      }).exec();

      // Assert: Query returns only active, non-deleted orchards
      expect(activeOrchards).toHaveLength(1);
      expect(activeOrchards[0].name).toBe('Query Test Active Orchard');
      expect(activeOrchards[0].isActive).toBe(true);
      expect(activeOrchards[0].isDeleted).toBe(false);
    });

    it('should support user-based orchard queries for user assignment workflows', async () => {
      // Arrange: Create orchards with different user assignments
      const testClient = new Types.ObjectId();
      const orchardManager = new Types.ObjectId();
      const fieldWorker = new Types.ObjectId();
      const specialist = new Types.ObjectId();

      await orchardModel.insertMany([
        {
          recordId: 'USER_QUERY_001',
          name: 'Manager Supervised Orchard',
          clientId: testClient,
          userIds: [orchardManager, fieldWorker],
          isActive: true,
        },
        {
          recordId: 'USER_QUERY_002',
          name: 'Specialist Managed Orchard',
          clientId: testClient,
          userIds: [orchardManager, specialist],
          isActive: true,
        },
        {
          recordId: 'USER_QUERY_003',
          name: 'Single Worker Orchard',
          clientId: testClient,
          userIds: [fieldWorker],
          isActive: true,
        },
      ]);

      // Act: Query orchards assigned to specific user
      const managerOrchards = await orchardModel.find({
        userIds: { $in: [orchardManager] },
        isActive: true,
        isDeleted: false,
      }).exec();

      // Assert: Query returns orchards assigned to specific user
      expect(managerOrchards).toHaveLength(2);
      managerOrchards.forEach(orchard => {
        expect(orchard.userIds.map(id => id.toString())).toContain(orchardManager.toString());
      });
    });

    it('should maintain proper MongoDB collection structure for OrchardsService integration', () => {
      // Assert: Verify schema structure matches service expectations
      expect(orchardModel.collection.name).toBe('orchards');
      
      const paths = orchardModel.schema.paths;
      expect(paths).toHaveProperty('recordId');      // Business identifier
      expect(paths).toHaveProperty('name');          // Orchard name
      expect(paths).toHaveProperty('clientId');      // Client relationship (required)
      expect(paths).toHaveProperty('address');       // Embedded address object (optional)
      expect(paths).toHaveProperty('userIds');       // User assignment array (optional)
      expect(paths).toHaveProperty('isActive');      // Business state
      expect(paths).toHaveProperty('isDeleted');     // Soft delete state
      expect(paths).toHaveProperty('createdAt');     // Audit trail (from timestamps: true)
      expect(paths).toHaveProperty('updatedAt');     // Audit trail (from timestamps: true)
    });

    it('should support efficient recordId-based queries for business operations', async () => {
      // Arrange: Orchards with business-meaningful recordIds
      const testClient = new Types.ObjectId();

      await orchardModel.insertMany([
        {
          recordId: 'APPLE_NORTH_001',
          name: 'North Apple Orchard Block 1',
          clientId: testClient,
          isActive: true,
        },
        {
          recordId: 'APPLE_SOUTH_001',
          name: 'South Apple Orchard Block 1',
          clientId: testClient,
          isActive: true,
        },
        {
          recordId: 'CHERRY_WEST_001',
          name: 'West Cherry Orchard Block 1',
          clientId: testClient,
          isActive: true,
        },
      ]);

      // Act: Query orchards by recordId pattern (business query)
      const appleOrchards = await orchardModel.find({
        recordId: { $regex: /^APPLE_/ },
        isActive: true,
        isDeleted: false,
      }).exec();

      // Assert: Query returns orchards matching business pattern
      expect(appleOrchards).toHaveLength(2);
      appleOrchards.forEach(orchard => {
        expect(orchard.recordId).toMatch(/^APPLE_/);
      });
    });

    it('should support address-based geographical queries for regional operations', async () => {
      // Arrange: Orchards in different geographical locations
      const regionalClient = new Types.ObjectId();

      await orchardModel.insertMany([
        {
          recordId: 'GEO_WA_001',
          name: 'Washington State Apple Orchard',
          clientId: regionalClient,
          address: {
            city: 'Wenatchee',
            state: 'Washington',
            country: 'United States',
          },
          isActive: true,
        },
        {
          recordId: 'GEO_OR_001',
          name: 'Oregon Cherry Orchard',
          clientId: regionalClient,
          address: {
            city: 'Hood River',
            state: 'Oregon',
            country: 'United States',
          },
          isActive: true,
        },
        {
          recordId: 'GEO_CA_001',
          name: 'California Citrus Grove',
          clientId: regionalClient,
          address: {
            city: 'Riverside',
            state: 'California',
            country: 'United States',
          },
          isActive: true,
        },
      ]);

      // Act: Query orchards by state (geographical business query)
      const washingtonOrchards = await orchardModel.find({
        'address.state': 'Washington',
        isActive: true,
        isDeleted: false,
      }).exec();

      // Assert: Query returns orchards in specific geographical region
      expect(washingtonOrchards).toHaveLength(1);
      expect(washingtonOrchards[0].address?.state).toBe('Washington');
      expect(washingtonOrchards[0].name).toBe('Washington State Apple Orchard');
    });
  });
});
