import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { OrchardsService } from './orchards.service';
import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { User, UserType } from '../users/schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';
import { CountersService } from '../counters/counters.service';
import { VisibilityService } from '../common/visibility/visibility.service';
import { UsersService } from '../users/users.service';

import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { PERMISSIONS } from '../common/constants/permissions.constants';

jest.mock('./builders/orchards-query.builder');

const mockOrchardId = new Types.ObjectId().toHexString();
const mockClientId = new Types.ObjectId().toHexString();
const mockUserId = new Types.ObjectId().toHexString();

// Mock User object for testing agricultural operations
const mockUser = (permissions: string[] = [], visibilityScope: VisibilityScope = VisibilityScope.GLOBAL): User => ({
  _id: new Types.ObjectId().toHexString(),
  recordId: 'USR_FARM_001',
  firstName: 'Agricultural',
  lastName: 'Manager',
  name: 'Agricultural Manager',
  email: 'manager@valleyorchards.com',
  userType: UserType.EMPLOYEE,
  clientIds: [new Types.ObjectId(mockClientId)],
  isActive: true,
  isDeleted: false,
  roleId: {
    _id: new Types.ObjectId().toHexString(),
    recordId: 'ROL_FARM_001',
    name: 'Farm Manager',
    permissions,
    visibilityScope,
    isActive: true,
    isDeleted: false,
  },
} as any);

// Mock Orchard document
const mockOrchardDoc = {
  _id: mockOrchardId,
  recordId: 'ORC0001',
  name: 'Premium Apple Orchard - North Block',
  clientId: new Types.ObjectId(mockClientId),
  address: {
    street: '1500 Orchard Valley Road',
    city: 'Wenatchee',
    state: 'Washington',
    postalCode: '98801',
    country: 'United States',
  },
  userIds: [new Types.ObjectId(mockUserId)],
  isActive: true,
  isDeleted: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('OrchardsService - RootStock Agricultural Orchard Management', () => {
  let service: OrchardsService;
  let orchardModel: Model<OrchardDocument>;
  let clientResolverService: ClientResolverService;
  let countersService: CountersService;
  let visibilityService: VisibilityService;
  let usersService: UsersService;

  const mockOrchardModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    exists: jest.fn(),
    exec: jest.fn(),
  } as any;

  // Mock constructor function
  const mockOrchardConstructor = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue({ ...dto, _id: mockOrchardId }),
  }));

  // Assign the constructor properties to the mock
  Object.assign(mockOrchardConstructor, mockOrchardModel);

  const mockClientResolverService = {
    resolveClientsForUser: jest.fn(),
    getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
    getAccessibleSubsidiaryIdsForUser: jest.fn(),
  };

  const mockCountersService = {
    getNextSequenceValue: jest.fn().mockResolvedValue({
      prefix: 'ORC',
      sequence_value: 1,
    }),
  };

  const mockVisibilityService = {
    validateClientAccess: jest.fn(),
    validateSingleClientAccess: jest.fn(),
    validateResourceAccessByClientId: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
    userModel: {
      find: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrchardsService,
        { provide: getModelToken(Orchard.name), useValue: mockOrchardConstructor },
        { provide: ClientResolverService, useValue: mockClientResolverService },
        { provide: CountersService, useValue: mockCountersService },
        { provide: VisibilityService, useValue: mockVisibilityService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    service = module.get<OrchardsService>(OrchardsService);
    orchardModel = module.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
    clientResolverService = module.get<ClientResolverService>(ClientResolverService);
    countersService = module.get<CountersService>(CountersService);
    visibilityService = module.get<VisibilityService>(VisibilityService);
    usersService = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  describe('Inactive Orchard Access Control - Business Logic', () => {
    it('should allow orchard managers with Orchard:ManageInactive permission to see inactive orchards', async () => {
      // Arrange: Orchard manager requesting inactive orchard data for seasonal planning
      const orchardManagerUser = mockUser([PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_MANAGE_INACTIVE], VisibilityScope.CLIENT);
      const queryDto: QueryOrchardDto = {
        includeInactives: true,
      };

      const inactiveOrchards = [
        { ...mockOrchardDoc, isActive: false, name: 'Dormant Winter Orchard - Block A' },
        { ...mockOrchardDoc, isActive: true, name: 'Active Spring Orchard - Block B' }
      ];

      const mockPopulate1 = jest.fn().mockReturnThis();
      const mockPopulate2 = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(inactiveOrchards);

      mockOrchardModel.find.mockReturnValue({
        populate: mockPopulate1.mockReturnValue({
          populate: mockPopulate2,
        }),
      });

      mockPopulate2.mockReturnValue({
        exec: mockExec,
      });

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);

      // Act: Query including inactive orchards with proper permission
      const result = await service.findAll(queryDto, orchardManagerUser);

      // Assert: Manager can access both active and inactive orchards for seasonal planning
      expect(result).toEqual(inactiveOrchards);
      expect(result.length).toBe(2);
      expect(result.some(orchard => !orchard.isActive)).toBe(true);
    });

    it('should prevent standard growers from accessing inactive orchards even when requested', async () => {
      // Arrange: Standard grower attempting to access inactive orchard data
      const standardGrowerUser = mockUser([PERMISSIONS.ORCHARD_VIEW], VisibilityScope.CLIENT);
      const queryDto: QueryOrchardDto = {
        includeInactives: true,
      };

      const activeOrchardsOnly = [
        { ...mockOrchardDoc, isActive: true, name: 'Active Spring Orchard - Block B' }
      ];

      const mockPopulate1 = jest.fn().mockReturnThis();
      const mockPopulate2 = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(activeOrchardsOnly);

      mockOrchardModel.find.mockReturnValue({
        populate: mockPopulate1.mockReturnValue({
          populate: mockPopulate2,
        }),
      });

      mockPopulate2.mockReturnValue({
        exec: mockExec,
      });

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);

      // Act: Query attempting to include inactive orchards without permission
      const result = await service.findAll(queryDto, standardGrowerUser);

      // Assert: Security boundary enforced - only active orchards returned
      expect(result).toEqual(activeOrchardsOnly);
      expect(result.every(orchard => orchard.isActive)).toBe(true);
    });

    it('should maintain default active-only behavior for standard orchard queries', async () => {
      // Arrange: Standard orchard query without explicit inactive request
      const anyUser = mockUser([PERMISSIONS.ORCHARD_VIEW], VisibilityScope.CLIENT);
      const queryDto: QueryOrchardDto = {
        name: 'apple',
      };

      const activeOrchards = [
        { ...mockOrchardDoc, isActive: true, name: 'Active Apple Orchard - North Valley' }
      ];

      const mockPopulate1 = jest.fn().mockReturnThis();
      const mockPopulate2 = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(activeOrchards);

      mockOrchardModel.find.mockReturnValue({
        populate: mockPopulate1.mockReturnValue({
          populate: mockPopulate2,
        }),
      });

      mockPopulate2.mockReturnValue({
        exec: mockExec,
      });

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);

      // Act: Standard query without inactive flag
      const result = await service.findAll(queryDto, anyUser);

      // Assert: Default behavior shows only active orchards for operational use
      expect(result).toEqual(activeOrchards);
      expect(result.every(orchard => orchard.isActive)).toBe(true);
    });

    it('should deny inactive orchard access when user has other permissions but lacks ManageInactive', async () => {
      // Arrange: User with administrative permissions but no Orchard:ManageInactive
      const partialAdminUser = mockUser([
        PERMISSIONS.ORCHARD_VIEW, 
        PERMISSIONS.ORCHARD_EDIT, 
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.CLIENT_MANAGE_INACTIVE  // Has Client inactive permission but not Orchard
      ], VisibilityScope.GLOBAL);
      
      const queryDto: QueryOrchardDto = {
        includeInactives: true,
      };

      const activeOrchardsOnly = [
        { ...mockOrchardDoc, isActive: true, name: 'Active Production Orchard' }
      ];

      const mockPopulate1 = jest.fn().mockReturnThis();
      const mockPopulate2 = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(activeOrchardsOnly);

      mockOrchardModel.find.mockReturnValue({
        populate: mockPopulate1.mockReturnValue({
          populate: mockPopulate2,
        }),
      });

      mockPopulate2.mockReturnValue({
        exec: mockExec,
      });

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);

      // Act: Query for inactive orchards without specific permission
      const result = await service.findAll(queryDto, partialAdminUser);

      // Assert: Resource-specific permissions enforced - no cross-resource privilege escalation
      expect(result).toEqual(activeOrchardsOnly);
      expect(result.every(orchard => orchard.isActive)).toBe(true);
    });

    it('should enforce resource-specific permission boundaries for inactive access', async () => {
      // Arrange: User with User:ManageInactive but not Orchard:ManageInactive
      const userManagerRole = mockUser([
        PERMISSIONS.ORCHARD_VIEW,
        PERMISSIONS.USER_MANAGE_INACTIVE,  // Wrong resource permission
        PERMISSIONS.ROLE_VIEW
      ], VisibilityScope.CLIENT);
      
      const queryDto: QueryOrchardDto = {
        includeInactives: true,
      };

      const activeOrchardsOnly = [
        { ...mockOrchardDoc, isActive: true, name: 'Secure Active Orchard' }
      ];

      const mockPopulate1 = jest.fn().mockReturnThis();
      const mockPopulate2 = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(activeOrchardsOnly);

      mockOrchardModel.find.mockReturnValue({
        populate: mockPopulate1.mockReturnValue({
          populate: mockPopulate2,
        }),
      });

      mockPopulate2.mockReturnValue({
        exec: mockExec,
      });

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);

      // Act: Attempt to access inactive orchards with wrong resource permission
      const result = await service.findAll(queryDto, userManagerRole);

      // Assert: Business rule - User management permissions do not grant orchard management permissions
      expect(result).toEqual(activeOrchardsOnly);
      expect(result.every(orchard => orchard.isActive)).toBe(true);
    });
  });

  describe('Agricultural Orchard Creation Operations', () => {
    it('should create premium apple orchard for commercial operations', async () => {
      // Arrange: Premium commercial apple orchard creation
      const user = mockUser([PERMISSIONS.ORCHARD_CREATE], VisibilityScope.CLIENT);
      const createDto: CreateOrchardDto = {
        name: 'Premium Apple Orchard - North Valley',
        clientId: mockClientId,
        address: {
          street: '1500 Premium Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
        userIds: [mockUserId],
      };

      mockVisibilityService.validateSingleClientAccess.mockResolvedValue(true);
      mockUsersService.findOne.mockResolvedValue({ _id: mockUserId, clientIds: [mockClientId] });
      mockUsersService.userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{
          _id: mockUserId,
          recordId: 'USR001',
          clientIds: [new Types.ObjectId(mockClientId)]
        }])
      });

      const expectedOrchard = {
        ...createDto,
        recordId: 'ORC0001',
        userIds: [new Types.ObjectId(mockUserId)],
        _id: mockOrchardId,
      };

      mockOrchardConstructor.mockImplementationOnce((dto) => ({
        ...dto,
        save: jest.fn().mockResolvedValue(expectedOrchard),
      }));

      // Act: Create premium apple orchard
      const result = await service.create(createDto, user);

      // Assert: Premium orchard created with proper agricultural setup
      expect(mockVisibilityService.validateSingleClientAccess).toHaveBeenCalledWith(mockClientId, user);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(mockUserId, user);
      expect(mockCountersService.getNextSequenceValue).toHaveBeenCalledWith('orchard', 'ORC');
      expect(result).toEqual(expectedOrchard);
    });

    it('should reject orchard creation when user does not belong to client', async () => {
      // Arrange: User assignment to different client (security violation)
      const user = mockUser([PERMISSIONS.ORCHARD_CREATE], VisibilityScope.CLIENT);
      const wrongClientId = new Types.ObjectId().toHexString();
      const createDto: CreateOrchardDto = {
        name: 'Invalid Assignment Orchard',
        clientId: mockClientId,
        userIds: [mockUserId],
      };

      mockVisibilityService.validateSingleClientAccess.mockResolvedValue(true);
      mockUsersService.findOne.mockResolvedValue({ _id: mockUserId, clientIds: [wrongClientId] });
      mockUsersService.userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([{
          _id: mockUserId,
          recordId: 'USR001',
          clientIds: [new Types.ObjectId(wrongClientId)]
        }])
      });

      // Act & Assert: Expect security violation to be rejected
      await expect(service.create(createDto, user)).rejects.toThrow(BadRequestException);
      expect(mockVisibilityService.validateSingleClientAccess).toHaveBeenCalledWith(mockClientId, user);
    });

    it('should validate user permissions for orchard creation', async () => {
      // Arrange: User without orchard creation permissions
      const user = mockUser([], VisibilityScope.CLIENT);
      const createDto: CreateOrchardDto = {
        name: 'Unauthorized Orchard',
        clientId: mockClientId,
      };

      mockVisibilityService.validateSingleClientAccess.mockRejectedValue(new Error('Insufficient permissions'));

      // Act & Assert: Expect permission validation to prevent creation
      await expect(service.create(createDto, user)).rejects.toThrow();
    });
  });

  describe('Agricultural Orchard Retrieval Operations', () => {
    it('should find single orchard with security validation', async () => {
      // Arrange: Single orchard lookup with security checks
      const user = mockUser([PERMISSIONS.ORCHARD_VIEW], VisibilityScope.CLIENT);

      const mockPopulate = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(mockOrchardDoc);

      mockOrchardModel.findOne.mockReturnValue({
        populate: mockPopulate,
        exec: mockExec,
      });

      // Act: Find single orchard with security validation
      const result = await service.findOne(mockOrchardId, user);

      // Assert: Single orchard retrieved with proper security checks
      expect(mockOrchardModel.findOne).toHaveBeenCalled();
      expect(mockPopulate).toHaveBeenCalledWith('clientId', 'name recordId');
      expect(mockPopulate).toHaveBeenCalledWith('userIds', 'name recordId userType');
      expect(result).toEqual(mockOrchardDoc);
    });

    it('should allow finding inactive orchard when user has Orchard:ManageInactive permission and includeInactive option is used', async () => {
      // Arrange: Finding a specific inactive orchard for administrative review
      const orchardAdminUser = mockUser([PERMISSIONS.ORCHARD_VIEW, PERMISSIONS.ORCHARD_MANAGE_INACTIVE], VisibilityScope.CLIENT);
      const inactiveOrchardDoc = { ...mockOrchardDoc, isActive: false, name: 'Dormant Seasonal Orchard' };

      const mockPopulate = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(inactiveOrchardDoc);

      mockOrchardModel.findOne.mockReturnValue({
        populate: mockPopulate,
        exec: mockExec,
      });

      // Act: Find inactive orchard with includeInactive option
      const result = await service.findOne(mockOrchardId, orchardAdminUser, { includeInactive: true });

      // Assert: Admin can access inactive orchard for seasonal management
      expect(mockOrchardModel.findOne).toHaveBeenCalled();
      expect(result).toEqual(inactiveOrchardDoc);
      expect(result.isActive).toBe(false);
    });

    it('should prevent access to inactive orchard when user lacks ManageInactive permission', async () => {
      // Arrange: Standard user attempting to access inactive orchard
      const standardUser = mockUser([PERMISSIONS.ORCHARD_VIEW], VisibilityScope.CLIENT);

      const mockPopulate = jest.fn().mockReturnThis();
      const mockExec = jest.fn().mockResolvedValue(null); // Query would filter out inactive orchard

      mockOrchardModel.findOne.mockReturnValue({
        populate: mockPopulate,
        exec: mockExec,
      });

      // Act & Assert: Standard user cannot access inactive orchard even with includeInactive option
      await expect(service.findOne(mockOrchardId, standardUser, { includeInactive: true }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when orchard not found', async () => {
      // Arrange: Orchard lookup for non-existent resource
      const user = mockUser([PERMISSIONS.ORCHARD_VIEW], VisibilityScope.CLIENT);

      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert: Expect NotFoundException for missing orchard
      await expect(service.findOne(mockOrchardId, user)).rejects.toThrow(NotFoundException);
    });

    it('should validate orchard IDs correctly', async () => {
      // Arrange: Validate multiple orchard IDs
      const orchardIds = [mockOrchardId, new Types.ObjectId().toHexString()];
      mockOrchardModel.countDocuments.mockResolvedValue(2);

      // Act: Validate orchard IDs
      const result = await service.validateOrchardIds(orchardIds);

      // Assert: Validation successful
      expect(result).toBe(true);
      expect(mockOrchardModel.countDocuments).toHaveBeenCalledWith({
        _id: { $in: orchardIds.map(id => new Types.ObjectId(id)) },
        isActive: true,
        isDeleted: false,
      });
    });

    it('should return true for empty orchard ID validation', async () => {
      // Arrange: Empty orchard ID array
      const orchardIds: string[] = [];

      // Act: Validate empty array
      const result = await service.validateOrchardIds(orchardIds);

      // Assert: Empty validation should return true
      expect(result).toBe(true);
      expect(mockOrchardModel.countDocuments).not.toHaveBeenCalled();
    });
  });

  describe('Agricultural Orchard Update Operations', () => {
    it('should update orchard with agricultural improvements', async () => {
      // Arrange: Update orchard with agricultural enhancements
      const user = mockUser([PERMISSIONS.ORCHARD_EDIT], VisibilityScope.CLIENT);
      const updateDto: UpdateOrchardDto = {
        name: 'Premium Apple Orchard - Enhanced North Valley',
        address: {
          street: '1500 Enhanced Premium Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
      };

      const existingOrchard = { 
        ...mockOrchardDoc, 
        clientId: { _id: new Types.ObjectId(mockClientId), name: 'Test Client', recordId: 'CLI001' } // Mock populated clientId
      };
      
      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existingOrchard),
      });

      const updatedOrchard = { ...existingOrchard, ...updateDto };
      mockOrchardModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedOrchard),
      });

      // Act: Update orchard with agricultural improvements
      const result = await service.update(mockOrchardId, updateDto, user);

      // Assert: Orchard updated with enhanced agricultural features
      expect(result.name).toBe('Premium Apple Orchard - Enhanced North Valley');
      expect(result.address.street).toBe('1500 Enhanced Premium Valley Road');
    });

    it('should handle orchard user assignment updates', async () => {
      // Arrange: Update orchard user assignments
      const user = mockUser([PERMISSIONS.ORCHARD_EDIT], VisibilityScope.CLIENT);
      const newUserId = new Types.ObjectId().toHexString();
      const updateDto: UpdateOrchardDto = {
        userIds: [mockUserId, newUserId],
      };

      const existingOrchard = { 
        ...mockOrchardDoc, 
        clientId: { _id: new Types.ObjectId(mockClientId), name: 'Test Client', recordId: 'CLI001' } // Mock populated clientId
      };
      
      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existingOrchard),
      });

      mockVisibilityService.validateResourceAccessByClientId.mockResolvedValue(true);
      mockUsersService.userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          { _id: mockUserId, recordId: 'USR001', clientIds: [new Types.ObjectId(mockClientId)] },
          { _id: newUserId, recordId: 'USR002', clientIds: [new Types.ObjectId(mockClientId)] }
        ])
      });

      const updatedOrchard = { 
        ...existingOrchard, 
        userIds: [new Types.ObjectId(mockUserId), new Types.ObjectId(newUserId)] 
      };
      mockOrchardModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedOrchard),
      });

      // Act: Update orchard user assignments
      const result = await service.update(mockOrchardId, updateDto, user);

      // Assert: User assignments updated correctly
      expect(result.userIds).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent orchard update', async () => {
      // Arrange: Update attempt on non-existent orchard
      const user = mockUser([PERMISSIONS.ORCHARD_EDIT], VisibilityScope.CLIENT);
      const updateDto: UpdateOrchardDto = {
        name: 'Non-existent Orchard',
      };

      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      // Act & Assert: Expect NotFoundException for missing orchard
      await expect(service.update(mockOrchardId, updateDto, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Agricultural Orchard Deletion Operations', () => {
    it('should soft delete orchard maintaining agricultural data integrity', async () => {
      // Arrange: Soft delete orchard while preserving agricultural history
      const user = mockUser([PERMISSIONS.ORCHARD_DELETE], VisibilityScope.CLIENT);

      const existingOrchard = { ...mockOrchardDoc, clientId: mockClientId };
      
      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existingOrchard),
      });

      mockVisibilityService.validateResourceAccessByClientId.mockResolvedValue(true);

      const softDeletedOrchard = {
        ...existingOrchard,
        isDeleted: true,
        isActive: false,
      };

      mockOrchardModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(softDeletedOrchard),
      });

      // Act: Soft delete orchard
      const result = await service.remove(mockOrchardId, user);

      // Assert: Orchard soft deleted with agricultural data preserved
      expect(mockVisibilityService.validateResourceAccessByClientId).toHaveBeenCalledWith(mockOrchardId, 'Orchard', user);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.name).toBe('Premium Apple Orchard - North Block'); // Name preserved
    });

    it('should prevent unauthorized orchard deletion', async () => {
      // Arrange: Deletion attempt without proper permissions
      const user = mockUser([], VisibilityScope.CLIENT);

      const existingOrchard = { ...mockOrchardDoc, clientId: mockClientId };
      
      mockOrchardModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(existingOrchard),
      });

      mockVisibilityService.validateResourceAccessByClientId.mockRejectedValue(new Error('Unauthorized'));

      // Act & Assert: Expect authorization failure
      await expect(service.remove(mockOrchardId, user)).rejects.toThrow();
    });
  });

  describe('Agricultural Business Logic Edge Cases', () => {
    it('should handle null/undefined orchard ID validation gracefully', async () => {
      // Arrange: Edge case with null/undefined validation
      
      // Act & Assert: Handle null gracefully
      expect(await service.validateOrchardIds(null as any)).toBe(true);
      expect(await service.validateOrchardIds(undefined as any)).toBe(true);
      expect(mockOrchardModel.countDocuments).not.toHaveBeenCalled();
    });

    it('should validate insufficient orchard count during ID validation', async () => {
      // Arrange: ID validation with insufficient database matches
      const orchardIds = [mockOrchardId, new Types.ObjectId().toHexString()];
      mockOrchardModel.countDocuments.mockResolvedValue(1); // Only 1 of 2 found

      // Act: Validate with insufficient matches
      const result = await service.validateOrchardIds(orchardIds);

      // Assert: Validation should fail for insufficient matches
      expect(result).toBe(false);
    });
  });
});
