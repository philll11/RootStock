import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

import { OrchardsController } from './orchards.controller';
import { OrchardsService } from './orchards.service';

import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';

import { UserType } from '../users/schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// Mock request object with user context following RootStock agricultural patterns
const createMockRequest = (userRole: any = null) => ({
  user: {
    _id: new Types.ObjectId(),
    recordId: 'USR_FARM_001',
    firstName: 'Agricultural',
    lastName: 'Manager',
    name: 'Agricultural Manager',
    email: 'manager@valleyorchards.com',
    userType: UserType.EMPLOYEE,
    clientIds: [new Types.ObjectId()],
    isActive: true,
    isDeleted: false,
    roleId: userRole || {
      _id: new Types.ObjectId(),
      recordId: 'ROL_FARM_001',
      name: 'Farm Operations Manager',
      visibilityScope: VisibilityScope.CLIENT,
      permissions: [
        PERMISSIONS.ORCHARD_VIEW,
        PERMISSIONS.ORCHARD_CREATE,
        PERMISSIONS.ORCHARD_EDIT,
        PERMISSIONS.ORCHARD_DELETE
      ],
      isActive: true,
      isDeleted: false,
    }
  }
});

describe('OrchardsController - RootStock Agricultural Orchard Management', () => {
  let controller: OrchardsController;
  let orchardsService: jest.Mocked<OrchardsService>;

  const mockOrchardId = new Types.ObjectId().toHexString();
  const mockClientId = new Types.ObjectId().toHexString();
  const mockUserId = new Types.ObjectId().toHexString();

  // Mock comprehensive orchard data for agricultural testing
  const mockOrchard = {
    _id: mockOrchardId,
    recordId: 'ORC0001',
    name: 'Premium Apple Orchard - North Valley',
    clientId: new Types.ObjectId(mockClientId),
    address: {
      street: '1500 Premium Valley Road',
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

  beforeEach(async () => {
    const mockOrchardsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrchardsController],
      providers: [
        { provide: OrchardsService, useValue: mockOrchardsService },
      ],
    }).compile();

    controller = module.get<OrchardsController>(OrchardsController);
    orchardsService = module.get(OrchardsService);

    jest.clearAllMocks();
  });

  describe('Agricultural Orchard Creation Endpoint - POST /orchards', () => {
    it('should create premium apple orchard for commercial operations', async () => {
      // Arrange: Premium commercial apple orchard creation via HTTP
      const mockRequest = createMockRequest();
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

      const expectedOrchard = {
        ...mockOrchard,
        ...createDto,
        recordId: 'ORC0001',
        userIds: [new Types.ObjectId(mockUserId)],
      };

      orchardsService.create.mockResolvedValue(expectedOrchard as any);

      // Act: Create premium apple orchard via HTTP endpoint
      const result = await controller.create(createDto, mockRequest);

      // Assert: Verify service integration and agricultural orchard response
      expect(orchardsService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
      expect(result).toEqual(expectedOrchard);
      expect(result.name).toBe('Premium Apple Orchard - North Valley');
      expect(result.address.city).toBe('Wenatchee');
    });

    it('should create organic citrus orchard with sustainability focus', async () => {
      // Arrange: Organic citrus orchard for sustainable agriculture
      const mockRequest = createMockRequest();
      const createDto: CreateOrchardDto = {
        name: 'Certified Organic Citrus Grove - Valencia',
        clientId: mockClientId,
        address: {
          street: '2500 Organic Grove Avenue',
          city: 'Valencia',
          state: 'California',
          postalCode: '91355',
          country: 'United States',
        },
        userIds: [mockUserId],
      };

      const expectedOrchard = {
        ...mockOrchard,
        ...createDto,
        recordId: 'ORC0002',
        name: 'Certified Organic Citrus Grove - Valencia',
      };

      orchardsService.create.mockResolvedValue(expectedOrchard as any);

      // Act: Create organic citrus orchard via HTTP
      const result = await controller.create(createDto, mockRequest);

      // Assert: Verify organic orchard creation with sustainability features
      expect(orchardsService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
      expect(result.name).toBe('Certified Organic Citrus Grove - Valencia');
      expect(result.address.city).toBe('Valencia');
    });

    it('should create heritage fruit orchard for specialty markets', async () => {
      // Arrange: Heritage variety orchard for premium specialty markets
      const mockRequest = createMockRequest();
      const createDto: CreateOrchardDto = {
        name: 'Heritage Heirloom Apple Orchard - Hudson Valley',
        clientId: mockClientId,
        address: {
          street: '3200 Heritage Farm Road',
          city: 'Cold Spring',
          state: 'New York',
          postalCode: '10516',
          country: 'United States',
        },
      };

      const expectedOrchard = {
        ...mockOrchard,
        ...createDto,
        recordId: 'ORC0003',
        name: 'Heritage Heirloom Apple Orchard - Hudson Valley',
        userIds: [],
      };

      orchardsService.create.mockResolvedValue(expectedOrchard as any);

      // Act: Create heritage orchard via HTTP
      const result = await controller.create(createDto, mockRequest);

      // Assert: Verify heritage orchard creation for specialty markets
      expect(result.name).toBe('Heritage Heirloom Apple Orchard - Hudson Valley');
      expect(result.address.state).toBe('New York');
    });
  });

  describe('Agricultural Orchard Retrieval Endpoints - GET /orchards', () => {
    it('should retrieve all orchards with agricultural filtering', async () => {
      // Arrange: Multi-orchard retrieval with agricultural parameters
      const mockRequest = createMockRequest();
      const queryDto: QueryOrchardDto = {
        name: 'apple',
        includeInactives: false,
      };

      const expectedOrchards = [
        mockOrchard,
        {
          ...mockOrchard,
          _id: new Types.ObjectId().toHexString(),
          recordId: 'ORC0002',
          name: 'Premium Apple Orchard - South Valley',
        },
      ];

      orchardsService.findAll.mockResolvedValue(expectedOrchards as any);

      // Act: Retrieve filtered orchards via HTTP
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify agricultural orchard filtering and response
      expect(orchardsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(expectedOrchards);
      expect(result).toHaveLength(2);
      expect(result[0].name).toContain('Apple Orchard');
    });

    it('should retrieve active orchards for harvest planning', async () => {
      // Arrange: Active orchards for agricultural harvest planning
      const mockRequest = createMockRequest();
      const queryDto: QueryOrchardDto = {
        includeInactives: false,
      };

      const activeOrchards = [
        {
          ...mockOrchard,
          name: 'Active Apple Orchard - Harvest Ready',
          isActive: true,
        },
      ];

      orchardsService.findAll.mockResolvedValue(activeOrchards as any);

      // Act: Retrieve active orchards for planning
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify active orchards for harvest operations
      expect(result[0].isActive).toBe(true);
      expect(result[0].name).toContain('Harvest Ready');
    });

    it('should retrieve single orchard with comprehensive details', async () => {
      // Arrange: Single orchard lookup with full agricultural details
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;

      const detailedOrchard = {
        ...mockOrchard,
        address: {
          street: '1500 Premium Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
        userIds: [
          {
            _id: mockUserId,
            recordId: 'USR001',
            name: 'Farm Supervisor',
            userType: UserType.EMPLOYEE,
          },
        ],
      };

      orchardsService.findOne.mockResolvedValue(detailedOrchard as any);

      // Act: Retrieve single orchard with details
      const result = await controller.findOne(orchardId, mockRequest);

      // Assert: Verify comprehensive orchard details retrieval
      expect(orchardsService.findOne).toHaveBeenCalledWith(orchardId, mockRequest.user);
      expect(result).toEqual(detailedOrchard);
      expect(result.address.city).toBe('Wenatchee');
      expect((result.userIds[0] as any).name).toBe('Farm Supervisor');
    });

    it('should handle orchard not found with proper error response', async () => {
      // Arrange: Orchard lookup for non-existent resource
      const mockRequest = createMockRequest();
      const nonExistentId = new Types.ObjectId().toHexString();

      orchardsService.findOne.mockRejectedValue(
        new NotFoundException(`Orchard with ID "${nonExistentId}" not found`)
      );

      // Act & Assert: Expect proper error handling for missing orchard
      await expect(controller.findOne(nonExistentId, mockRequest))
        .rejects.toThrow(NotFoundException);
      expect(orchardsService.findOne).toHaveBeenCalledWith(nonExistentId, mockRequest.user);
    });
  });

  describe('Agricultural Orchard Update Endpoint - PATCH /orchards/:id', () => {
    it('should update orchard with enhanced agricultural features', async () => {
      // Arrange: Update orchard with agricultural improvements
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;
      const updateDto: UpdateOrchardDto = {
        name: 'Enhanced Premium Apple Orchard - North Valley',
        address: {
          street: '1500 Enhanced Premium Valley Road',
          city: 'Wenatchee',
          state: 'Washington',
          postalCode: '98801',
          country: 'United States',
        },
      };

      const updatedOrchard = {
        ...mockOrchard,
        ...updateDto,
        name: 'Enhanced Premium Apple Orchard - North Valley',
      };

      orchardsService.update.mockResolvedValue(updatedOrchard as any);

      // Act: Update orchard via HTTP endpoint
      const result = await controller.update(orchardId, updateDto, mockRequest);

      // Assert: Verify orchard update with enhanced features
      expect(orchardsService.update).toHaveBeenCalledWith(orchardId, updateDto, mockRequest.user);
      expect(result).toEqual(updatedOrchard);
      expect(result.name).toBe('Enhanced Premium Apple Orchard - North Valley');
      expect(result.address.street).toBe('1500 Enhanced Premium Valley Road');
    });

    it('should update orchard user assignments for seasonal operations', async () => {
      // Arrange: Update user assignments for seasonal agricultural operations
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;
      const seasonalUserId = new Types.ObjectId().toHexString();
      const updateDto: UpdateOrchardDto = {
        userIds: [mockUserId, seasonalUserId],
      };

      const updatedOrchard = {
        ...mockOrchard,
        userIds: [
          new Types.ObjectId(mockUserId),
          new Types.ObjectId(seasonalUserId),
        ],
      };

      orchardsService.update.mockResolvedValue(updatedOrchard as any);

      // Act: Update orchard user assignments
      const result = await controller.update(orchardId, updateDto, mockRequest);

      // Assert: Verify seasonal user assignment updates
      expect(result.userIds).toHaveLength(2);
      expect(result.userIds[1].toString()).toBe(seasonalUserId);
    });

    it('should update orchard status for maintenance operations', async () => {
      // Arrange: Update orchard status for maintenance
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;
      const updateDto: UpdateOrchardDto = {
        isActive: false, // Temporarily inactive for maintenance
      };

      const maintenanceOrchard = {
        ...mockOrchard,
        isActive: false,
        name: 'Premium Apple Orchard - North Valley (Maintenance)',
      };

      orchardsService.update.mockResolvedValue(maintenanceOrchard as any);

      // Act: Update orchard for maintenance
      const result = await controller.update(orchardId, updateDto, mockRequest);

      // Assert: Verify maintenance status update
      expect(result.isActive).toBe(false);
      expect(result.name).toContain('(Maintenance)');
    });
  });

  describe('Agricultural Orchard Deletion Endpoint - DELETE /orchards/:id', () => {
    it('should soft delete orchard preserving agricultural history', async () => {
      // Arrange: Soft delete orchard while preserving agricultural data
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;

      const softDeletedOrchard = {
        ...mockOrchard,
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      };

      orchardsService.remove.mockResolvedValue(softDeletedOrchard as any);

      // Act: Soft delete orchard via HTTP
      const result = await controller.remove(orchardId, mockRequest);

      // Assert: Verify soft deletion with agricultural history preserved
      expect(orchardsService.remove).toHaveBeenCalledWith(orchardId, mockRequest.user);
      expect(result).toEqual(softDeletedOrchard);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.name).toBe('Premium Apple Orchard - North Valley'); // Name preserved
    });

    it('should handle unauthorized orchard deletion attempt', async () => {
      // Arrange: Deletion attempt without proper authorization
      const mockRequest = createMockRequest({
        _id: new Types.ObjectId(),
        recordId: 'ROL_LIMITED_001',
        name: 'Limited User',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.ORCHARD_VIEW], // No delete permission
        isActive: true,
        isDeleted: false,
      });
      const orchardId = mockOrchardId;

      orchardsService.remove.mockRejectedValue(
        new Error('Insufficient permissions to delete orchard')
      );

      // Act & Assert: Expect authorization failure
      await expect(controller.remove(orchardId, mockRequest))
        .rejects.toThrow('Insufficient permissions to delete orchard');
    });

    it('should handle deletion of non-existent orchard gracefully', async () => {
      // Arrange: Deletion attempt on non-existent orchard
      const mockRequest = createMockRequest();
      const nonExistentId = new Types.ObjectId().toHexString();

      orchardsService.remove.mockRejectedValue(
        new NotFoundException(`Orchard with ID "${nonExistentId}" not found`)
      );

      // Act & Assert: Expect proper error handling
      await expect(controller.remove(nonExistentId, mockRequest))
        .rejects.toThrow(NotFoundException);
      expect(orchardsService.remove).toHaveBeenCalledWith(nonExistentId, mockRequest.user);
    });
  });

  describe('Agricultural Business Integration Edge Cases', () => {
    it('should handle concurrent orchard operations gracefully', async () => {
      // Arrange: Concurrent operations on the same orchard
      const mockRequest = createMockRequest();
      const orchardId = mockOrchardId;

      orchardsService.findOne.mockResolvedValue(mockOrchard as any);

      // Act: Simulate concurrent reads
      const results = await Promise.all([
        controller.findOne(orchardId, mockRequest),
        controller.findOne(orchardId, mockRequest),
        controller.findOne(orchardId, mockRequest),
      ]);

      // Assert: Verify all concurrent operations succeed
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toEqual(mockOrchard);
      });
      expect(orchardsService.findOne).toHaveBeenCalledTimes(3);
    });

    it('should validate MongoDB ObjectId format in parameters', async () => {
      // Arrange: Invalid MongoDB ObjectId format
      const mockRequest = createMockRequest();
      const invalidId = 'invalid-mongo-id';

      // Note: In real implementation, ParseMongoIdPipe would handle this
      // Here we simulate the expected behavior
      const mockError = new Error('Invalid MongoDB ObjectId format');
      orchardsService.findOne.mockRejectedValue(mockError);

      // Act & Assert: Expect validation error for invalid ID format
      await expect(controller.findOne(invalidId, mockRequest))
        .rejects.toThrow('Invalid MongoDB ObjectId format');
    });

    it('should handle service layer errors with proper HTTP responses', async () => {
      // Arrange: Service layer database error
      const mockRequest = createMockRequest();
      const createDto: CreateOrchardDto = {
        name: 'Service Error Orchard',
        clientId: mockClientId,
      };

      const databaseError = new Error('Database connection failed');
      orchardsService.create.mockRejectedValue(databaseError);

      // Act & Assert: Expect service errors to propagate properly
      await expect(controller.create(createDto, mockRequest))
        .rejects.toThrow('Database connection failed');
    });
  });
});
