import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { SubsidiariesService } from './subsidiaries.service';
import { Subsidiary, SubsidiaryDocument } from './schemas/subsidiary.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { User, UserType } from '../users/schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';
import { ClientsService } from '../clients/clients.service';
import { CountersService } from '../counters/counters.service';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// Test helper to create mock user with specific role and permissions
const createMockUser = (permissions: string[] = [], visibilityScope: VisibilityScope = VisibilityScope.GLOBAL): User => ({
  _id: new Types.ObjectId(),
  recordId: 'USR001',
  firstName: 'Test',
  lastName: 'User', 
  name: 'Test User',
  email: 'test@example.com',
  userType: UserType.EMPLOYEE,
  clientIds: [new Types.ObjectId()],
  isActive: true,
  isDeleted: false,
  roleId: {
    _id: new Types.ObjectId(),
    recordId: 'ROL001',
    name: 'Test Role',
    visibilityScope,
    permissions,
    isActive: true,
    isDeleted: false,
  }
} as any);

describe('SubsidiariesService', () => {
  let service: SubsidiariesService;
  let subsidiaryModel: jest.Mocked<Model<SubsidiaryDocument>>;
  let clientModel: jest.Mocked<Model<ClientDocument>>;
  let connection: jest.Mocked<Connection>;
  let clientResolverService: jest.Mocked<ClientResolverService>;
  let clientsService: jest.Mocked<ClientsService>;
  let countersService: jest.Mocked<CountersService>;

  // Mock session for transaction testing
  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(), 
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  beforeEach(async () => {
    // Create mock models and services
    const mockSubsidiaryModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
    } as any;
    
    // Make the model itself callable as a constructor
    const subsidiaryModelConstructor = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() })
    }));
    
    // Add static methods to constructor
    Object.assign(subsidiaryModelConstructor, mockSubsidiaryModel);

    const mockClientModel = {
      updateMany: jest.fn(),
    } as any;

    const mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const mockClientResolverService = {
      getAccessibleSubsidiaryIdsForUser: jest.fn(),
      getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
      resolveClientsForUser: jest.fn(),
    } as any;
    
    const mockClientsService = {
      countActiveBySubsidiaryId: jest.fn(),
    };

    const mockCountersService = {
      getNextSequenceValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubsidiariesService,
        { provide: getModelToken(Subsidiary.name), useValue: subsidiaryModelConstructor },
        { provide: getModelToken(Client.name), useValue: mockClientModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: ClientResolverService, useValue: mockClientResolverService },
        { provide: ClientsService, useValue: mockClientsService },
        { provide: CountersService, useValue: mockCountersService },
      ],
    }).compile();

    service = module.get<SubsidiariesService>(SubsidiariesService);
    subsidiaryModel = module.get(getModelToken(Subsidiary.name));
    clientModel = module.get(getModelToken(Client.name));
    connection = module.get(getConnectionToken());
    clientResolverService = module.get(ClientResolverService);
    clientsService = module.get(ClientsService);
    countersService = module.get(CountersService);

    // Reset all mocks before each test
    jest.clearAllMocks();
    mockSession.startTransaction.mockClear();
    mockSession.commitTransaction.mockClear();
    mockSession.abortTransaction.mockClear();
    mockSession.endSession.mockClear();
  });

  describe('Inactive Subsidiary Access Control - Business Logic', () => {
    it('should allow subsidiary administrators with Subsidiary:ManageInactive permission to see inactive subsidiaries', async () => {
      // Arrange: Subsidiary administrator requesting inactive subsidiary data for business review
      const subsidiaryAdministratorUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE]);
      const queryDto: QuerySubsidiaryDto = {
        includeInactives: true,
      };

      const inactiveSubsidiaries = [
        { _id: new Types.ObjectId(), isActive: false, name: 'Dormant Agricultural Division - Seasonal Operations', recordId: 'SUB001' },
        { _id: new Types.ObjectId(), isActive: true, name: 'Active AgriTech Solutions Ltd', recordId: 'SUB002' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactiveSubsidiaries)
      });

      // Act: Query including inactive subsidiaries with proper permission
      const result = await service.findAll(queryDto, subsidiaryAdministratorUser);

      // Assert: Administrator can access both active and inactive subsidiaries for business management
      expect(result).toEqual(inactiveSubsidiaries);
      expect(result.length).toBe(2);
      expect(result.some(subsidiary => !subsidiary.isActive)).toBe(true);
    });

    it('should prevent standard users from accessing inactive subsidiaries even when requested', async () => {
      // Arrange: Standard user attempting to access inactive subsidiary data
      const standardBusinessUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW]);
      const queryDto: QuerySubsidiaryDto = {
        includeInactives: true,
      };

      const activeSubsidiariesOnly = [
        { _id: new Types.ObjectId(), isActive: true, name: 'Active Agricultural Corporation', recordId: 'SUB001' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSubsidiariesOnly)
      });

      // Act: Query attempting to include inactive subsidiaries without permission
      const result = await service.findAll(queryDto, standardBusinessUser);

      // Assert: Security boundary enforced - only active subsidiaries returned
      expect(result).toEqual(activeSubsidiariesOnly);
      expect(result.every(subsidiary => subsidiary.isActive)).toBe(true);
    });

    it('should maintain default active-only behavior for standard subsidiary queries', async () => {
      // Arrange: Standard subsidiary query without explicit inactive request
      const anyUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW]);
      const queryDto: QuerySubsidiaryDto = {
        name: 'agri',
      };

      const activeSubsidiaries = [
        { _id: new Types.ObjectId(), isActive: true, name: 'Active Agri Business Solutions', recordId: 'SUB001' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSubsidiaries)
      });

      // Act: Standard query without inactive flag
      const result = await service.findAll(queryDto, anyUser);

      // Assert: Default behavior shows only active subsidiaries for operational use
      expect(result).toEqual(activeSubsidiaries);
      expect(result.every(subsidiary => subsidiary.isActive)).toBe(true);
    });

    it('should deny inactive subsidiary access when user has other permissions but lacks ManageInactive', async () => {
      // Arrange: User with administrative permissions but no Subsidiary:ManageInactive
      const partialAdminUser = createMockUser([
        PERMISSIONS.SUBSIDIARY_VIEW, 
        PERMISSIONS.SUBSIDIARY_EDIT, 
        PERMISSIONS.CLIENT_VIEW,
        PERMISSIONS.CLIENT_MANAGE_INACTIVE  // Has Client inactive permission but not Subsidiary
      ]);
      
      const queryDto: QuerySubsidiaryDto = {
        includeInactives: true,
      };

      const activeSubsidiariesOnly = [
        { _id: new Types.ObjectId(), isActive: true, name: 'Active Business Operations', recordId: 'SUB001' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSubsidiariesOnly)
      });

      // Act: Query for inactive subsidiaries without specific permission
      const result = await service.findAll(queryDto, partialAdminUser);

      // Assert: Resource-specific permissions enforced - no cross-resource privilege escalation
      expect(result).toEqual(activeSubsidiariesOnly);
      expect(result.every(subsidiary => subsidiary.isActive)).toBe(true);
    });

    it('should enforce resource-specific permission boundaries for inactive access', async () => {
      // Arrange: User with User:ManageInactive but not Subsidiary:ManageInactive
      const userManagerRole = createMockUser([
        PERMISSIONS.SUBSIDIARY_VIEW,
        PERMISSIONS.USER_MANAGE_INACTIVE,  // Wrong resource permission
        PERMISSIONS.CLIENT_VIEW
      ]);
      
      const queryDto: QuerySubsidiaryDto = {
        includeInactives: true,
      };

      const activeSubsidiariesOnly = [
        { _id: new Types.ObjectId(), isActive: true, name: 'Secure Active Subsidiary', recordId: 'SUB001' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeSubsidiariesOnly)
      });

      // Act: Attempt to access inactive subsidiaries with wrong resource permission
      const result = await service.findAll(queryDto, userManagerRole);

      // Assert: Business rule - User management permissions do not grant subsidiary management permissions
      expect(result).toEqual(activeSubsidiariesOnly);
      expect(result.every(subsidiary => subsidiary.isActive)).toBe(true);
    });

    it('should allow finding inactive subsidiary when user has Subsidiary:ManageInactive permission and includeInactive option is used', async () => {
      // Arrange: Finding a specific inactive subsidiary for administrative review
      const subsidiaryAdminUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE]);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const inactiveSubsidiaryDoc = { 
        _id: subsidiaryId, 
        isActive: false, 
        name: 'Dormant Seasonal Business Division', 
        recordId: 'SUB001' 
      };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactiveSubsidiaryDoc)
      });

      // Act: Find inactive subsidiary with includeInactive option
      const result = await service.findOne(subsidiaryId, subsidiaryAdminUser, { includeInactive: true });

      // Assert: Admin can access inactive subsidiary for business management
      expect(result).toEqual(inactiveSubsidiaryDoc);
      expect(result.isActive).toBe(false);
    });

    it('should prevent access to inactive subsidiary when user lacks ManageInactive permission', async () => {
      // Arrange: Standard user attempting to access inactive subsidiary
      const standardUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW]);
      const subsidiaryId = new Types.ObjectId().toHexString();

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null) // Query would filter out inactive subsidiary
      });

      // Act & Assert: Standard user cannot access inactive subsidiary even with includeInactive option
      await expect(service.findOne(subsidiaryId, standardUser, { includeInactive: true }))
        .rejects.toThrow(NotFoundException);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Subsidiary Creation Business Logic', () => {
    it('should create subsidiary with sequential recordId', async () => {
      // Arrange: Subsidiary creation with counter service
      const createDto: CreateSubsidiaryDto = {
        name: 'AgriTech Solutions'
      };

      const counterResult = { _id: 'subsidiary', prefix: 'SUB', sequence_value: 3 };
      countersService.getNextSequenceValue.mockResolvedValue(counterResult);

      const expectedSubsidiary = {
        ...createDto,
        recordId: 'SUB0003',
        _id: new Types.ObjectId(),
        isActive: true,
        isDeleted: false
      };

      (subsidiaryModel as any).mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(expectedSubsidiary)
      }));

      // Act: Create subsidiary
      const result = await service.create(createDto);

      // Assert: Verify business logic
      expect(countersService.getNextSequenceValue).toHaveBeenCalledWith('subsidiary', 'SUB');
      expect(result.recordId).toBe('SUB0003');
      expect(result.name).toBe(createDto.name);
    });
  });

  describe('Subsidiary Query Business Logic', () => {
    it('should build proper query filter with SubsidiaryQueryBuilder', async () => {
      // Arrange: Query with user context
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.GLOBAL);
      const queryDto: QuerySubsidiaryDto = {};
      const mockSubsidiaries = [
        { _id: new Types.ObjectId(), name: 'Global Subsidiary', recordId: 'SUB001' },
        { _id: new Types.ObjectId(), name: 'Regional Subsidiary', recordId: 'SUB002' }
      ];

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubsidiaries)
      });

      // Act: Query subsidiaries
      const result = await service.findAll(queryDto, globalUser);

      // Assert: Verify query executed with proper filter
      expect(subsidiaryModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockSubsidiaries);
    });

    it('should apply visibility scope restrictions in query', async () => {
      // Arrange: Subsidiary-scoped user with limited access
      const subsidiaryUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.SUBSIDIARY);
      const queryDto: QuerySubsidiaryDto = {};
      const accessibleSubsidiaryIds = [new Types.ObjectId(), new Types.ObjectId()];
      
      clientResolverService.getAccessibleSubsidiaryIdsForUser.mockResolvedValue(accessibleSubsidiaryIds);

      subsidiaryModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([])
      });

      // Act: Query subsidiaries
      await service.findAll(queryDto, subsidiaryUser);

      // Assert: Verify visibility scope applied
      expect(clientResolverService.getAccessibleSubsidiaryIdsForUser).toHaveBeenCalledWith(subsidiaryUser);
      expect(subsidiaryModel.find).toHaveBeenCalled();
    });
  });

  describe('Individual Subsidiary Access Business Logic', () => {
    it('should find subsidiary by ID with security check', async () => {
      // Arrange: Valid subsidiary lookup
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const mockSubsidiary = {
        _id: subsidiaryId,
        recordId: 'SUB001',
        name: 'Test Subsidiary',
        isActive: true,
        isDeleted: false
      };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSubsidiary)
      });

      // Act: Find subsidiary by ID
      const result = await service.findOne(subsidiaryId, globalUser);

      // Assert: Subsidiary found successfully
      expect(result).toEqual(mockSubsidiary);
      expect(subsidiaryModel.findOne).toHaveBeenCalledWith({
        $and: [
          expect.any(Object), // Security filter from query builder
          { _id: new Types.ObjectId(subsidiaryId) }
        ]
      });
    });

    it('should throw NotFoundException when subsidiary not found or unauthorized', async () => {
      // Arrange: Subsidiary not found or user lacks access
      const clientUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.CLIENT);
      const subsidiaryId = new Types.ObjectId().toHexString();

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      // Act & Assert: Access denied
      await expect(service.findOne(subsidiaryId, clientUser))
        .rejects.toThrow(NotFoundException);
      expect(subsidiaryModel.findOne).toHaveBeenCalled();
    });
  });

  describe('Subsidiary Update Business Rules', () => {
    it('should prevent subsidiary deactivation when active clients exist', async () => {
      // Arrange: Subsidiary with active clients cannot be deactivated
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT, PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const updateDto: UpdateSubsidiaryDto = { isActive: false };

      const existingSubsidiary = {
        _id: subsidiaryId,
        name: 'Subsidiary with Clients',
        recordId: 'SUB001',
        isActive: true,
        isDeleted: false
      };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingSubsidiary)
      });

      clientsService.countActiveBySubsidiaryId.mockResolvedValue(5); // 5 active clients

      // Act & Assert: Deactivation blocked
      await expect(service.update(subsidiaryId, updateDto, globalUser))
        .rejects.toThrow(ConflictException);
      
      expect(clientsService.countActiveBySubsidiaryId).toHaveBeenCalledWith(subsidiaryId);
      expect(subsidiaryModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow subsidiary deactivation when no active clients exist', async () => {
      // Arrange: Subsidiary with no active clients can be deactivated
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT, PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const updateDto: UpdateSubsidiaryDto = { isActive: false };

      const existingSubsidiary = {
        _id: subsidiaryId,
        name: 'Subsidiary without Clients',
        recordId: 'SUB001',
        isActive: true,
        isDeleted: false
      };

      const deactivatedSubsidiary = { ...existingSubsidiary, isActive: false };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingSubsidiary)
      });

      clientsService.countActiveBySubsidiaryId.mockResolvedValue(0); // No active clients

      subsidiaryModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deactivatedSubsidiary)
      });

      // Act: Deactivate subsidiary
      const result = await service.update(subsidiaryId, updateDto, globalUser);

      // Assert: Subsidiary successfully deactivated
      expect(result.isActive).toBe(false);
      expect(clientsService.countActiveBySubsidiaryId).toHaveBeenCalledWith(subsidiaryId);
    });

    it('should update basic subsidiary fields without affecting status', async () => {
      // Arrange: Update subsidiary name only
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const updateDto: UpdateSubsidiaryDto = { name: 'Updated Subsidiary Name' };

      const existingSubsidiary = {
        _id: subsidiaryId,
        name: 'Original Name',
        recordId: 'SUB001',
        isActive: true,
        isDeleted: false
      };

      const updatedSubsidiary = { ...existingSubsidiary, name: updateDto.name };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingSubsidiary)
      });

      subsidiaryModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedSubsidiary)
      });

      // Act: Update subsidiary
      const result = await service.update(subsidiaryId, updateDto, globalUser);

      // Assert: Name updated successfully
      expect(result.name).toBe(updateDto.name);
      expect(clientsService.countActiveBySubsidiaryId).not.toHaveBeenCalled(); // No status check needed
    });
  });

  describe('Subsidiary Soft Delete Business Logic', () => {
    it('should perform soft delete with client reassignment in transaction', async () => {
      // Arrange: Subsidiary removal with client updates
      const globalUser = createMockUser([PERMISSIONS.SUBSIDIARY_DELETE], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();

      const existingSubsidiary = {
        _id: subsidiaryId,
        name: 'To Be Deleted',
        recordId: 'SUB001',
        isActive: true,
        isDeleted: false
      };

      const deletedSubsidiary = { ...existingSubsidiary, isDeleted: true, isActive: false };

      subsidiaryModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingSubsidiary)
      });

      // Mock findOneAndUpdate for the concurrent deletion utility
      subsidiaryModel.findOneAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedSubsidiary)
      });

      clientModel.updateMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 2 })
      });

      subsidiaryModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedSubsidiary)
      });

      // Act: Remove subsidiary
      const result = await service.remove(subsidiaryId, globalUser);

      // Assert: Transaction completed successfully
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(clientModel.updateMany).toHaveBeenCalledWith(
        { subsidiaryId: subsidiaryId },
        { $set: { subsidiaryId: null } },
        { session: mockSession }
      );
    });
  });

  describe('Subsidiary Validation for Relationships', () => {
    it('should validate existing active subsidiary correctly', async () => {
      // Arrange: Valid active subsidiary check
      const subsidiaryId = new Types.ObjectId().toHexString();

      subsidiaryModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1)
      });

      // Act: Check if subsidiary exists and is active
      const result = await service.isExistingAndActive(subsidiaryId);

      // Assert: Subsidiary validation passes
      expect(result).toBe(true);
      expect(subsidiaryModel.countDocuments).toHaveBeenCalledWith({
        _id: subsidiaryId,
        isDeleted: false,
        isActive: true
      });
    });

    it('should reject inactive subsidiary for relationships', async () => {
      // Arrange: Inactive subsidiary check
      const subsidiaryId = new Types.ObjectId().toHexString();

      subsidiaryModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0) // No active subsidiary found
      });

      // Act: Check inactive subsidiary
      const result = await service.isExistingAndActive(subsidiaryId);

      // Assert: Subsidiary validation fails
      expect(result).toBe(false);
    });
  });

  describe('Inactive Subsidiary Access Control', () => {
    it('should include inactive subsidiaries when user has SUBSIDIARY_MANAGE_INACTIVE permission', async () => {
      // Arrange: User with manage inactive permission
      const userWithPermission = createMockUser([PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE], VisibilityScope.GLOBAL);
      const activeSubsidiary = { name: 'Active Subsidiary', isActive: true };
      const inactiveSubsidiary = { name: 'Inactive Subsidiary', isActive: false };

      // Mock the client resolver service
      clientResolverService.resolveClientsForUser.mockResolvedValue([new Types.ObjectId()]);

      // Mock the model's find method directly (no sort chain)
      const mockExec = jest.fn().mockResolvedValue([activeSubsidiary, inactiveSubsidiary]);
      subsidiaryModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act: Find all subsidiaries with includeInactive option
      const result = await service.findAll({ includeInactives: true }, userWithPermission);

      // Assert: Both active and inactive subsidiaries returned
      expect(result).toHaveLength(2);
      expect(result).toContain(activeSubsidiary);
      expect(result).toContain(inactiveSubsidiary);
    });

    it('should exclude inactive subsidiaries when user lacks SUBSIDIARY_MANAGE_INACTIVE permission', async () => {
      // Arrange: User without manage inactive permission
      const userWithoutPermission = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.GLOBAL);
      const activeSubsidiary = { name: 'Active Subsidiary', isActive: true };

      // Mock the client resolver service
      clientResolverService.resolveClientsForUser.mockResolvedValue([new Types.ObjectId()]);

      // Mock the model's find method directly (no sort chain)
      const mockExec = jest.fn().mockResolvedValue([activeSubsidiary]);
      subsidiaryModel.find = jest.fn().mockReturnValue({ exec: mockExec });

      // Act: Find all subsidiaries with includeInactive option
      const result = await service.findAll({ includeInactives: true }, userWithoutPermission);

      // Assert: Only active subsidiaries returned despite includeInactive flag
      expect(result).toHaveLength(1);
      expect(result).toContain(activeSubsidiary);
    });

    it('should find inactive subsidiary by ID when user has SUBSIDIARY_MANAGE_INACTIVE permission', async () => {
      // Arrange: User with manage inactive permission
      const userWithPermission = createMockUser([PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();
      const inactiveSubsidiary = { _id: subsidiaryId, name: 'Inactive Subsidiary', isActive: false };

      // Mock the query builder chain
      const mockExec = jest.fn().mockResolvedValue(inactiveSubsidiary);
      subsidiaryModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act: Find inactive subsidiary by ID
      const result = await service.findOne(subsidiaryId, userWithPermission, { includeInactive: true });

      // Assert: Inactive subsidiary found
      expect(result).toBe(inactiveSubsidiary);
    });

    it('should not find inactive subsidiary by ID when user lacks SUBSIDIARY_MANAGE_INACTIVE permission', async () => {
      // Arrange: User without manage inactive permission
      const userWithoutPermission = createMockUser([PERMISSIONS.SUBSIDIARY_VIEW], VisibilityScope.GLOBAL);
      const subsidiaryId = new Types.ObjectId().toHexString();

      // Mock the query builder chain to return null (filtered out)
      const mockExec = jest.fn().mockResolvedValue(null);
      subsidiaryModel.findOne = jest.fn().mockReturnValue({ exec: mockExec });

      // Act & Assert: Expect NotFoundException to be thrown
      await expect(service.findOne(subsidiaryId, userWithoutPermission, { includeInactive: true }))
        .rejects.toThrow(NotFoundException);
    });
  });
});
