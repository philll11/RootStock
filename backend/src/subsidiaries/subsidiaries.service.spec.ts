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

// Test helper to create mock user with specific role
const createMockUser = (visibilityScope: VisibilityScope = VisibilityScope.GLOBAL): User => ({
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
    permissions: [PERMISSIONS.SUBSIDIARY_VIEW, PERMISSIONS.SUBSIDIARY_EDIT, PERMISSIONS.SUBSIDIARY_EDIT_STATUS],
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
      const subsidiaryUser = createMockUser(VisibilityScope.SUBSIDIARY);
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
      const clientUser = createMockUser(VisibilityScope.CLIENT);
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
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
});
