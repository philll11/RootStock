import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

import { ClientsController } from './clients.controller';
import { ClientsService } from './clients.service';
import { UsersService } from '../users/users.service';
import { OrchardsService } from '../orchards/orchards.service';

import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';

import { UserType } from '../users/schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// Mock request object with user context
const createMockRequest = (userRole: any = null) => ({
  user: {
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
    roleId: userRole || {
      _id: new Types.ObjectId(),
      recordId: 'ROL001',
      name: 'Administrator',
      visibilityScope: VisibilityScope.GLOBAL,
      permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_CREATE, PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_DELETE],
      isActive: true,
      isDeleted: false,
    }
  }
});

describe('ClientsController', () => {
  let controller: ClientsController;
  let clientsService: jest.Mocked<ClientsService>;
  let usersService: jest.Mocked<UsersService>;
  let orchardsService: jest.Mocked<OrchardsService>;

  beforeEach(async () => {
    const mockClientsService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockUsersService = {
      findAllByClientId: jest.fn(),
    };

    const mockOrchardsService = {
      findAllByClientId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClientsController],
      providers: [
        { provide: ClientsService, useValue: mockClientsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: OrchardsService, useValue: mockOrchardsService },
      ],
    }).compile();

    controller = module.get<ClientsController>(ClientsController);
    clientsService = module.get(ClientsService);
    usersService = module.get(UsersService);
    orchardsService = module.get(OrchardsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Client Creation Endpoint', () => {
    it('should create independent orchard client successfully', async () => {
      // Arrange: Independent grower client creation request
      const createDto: CreateClientDto = {
        name: 'Valley Vista Orchards',
        subsidiaryId: new Types.ObjectId().toHexString(),
      };

      const expectedClient = {
        _id: new Types.ObjectId(),
        recordId: 'CLI0001',
        ...createDto,
        subsidiaryId: new Types.ObjectId(createDto.subsidiaryId),
        isActive: true,
        isDeleted: false
      };

      clientsService.create.mockResolvedValue(expectedClient as any);

      // Act: Create client via HTTP endpoint
      const result = await controller.create(createDto);

      // Assert: Verify service integration and response
      expect(clientsService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedClient);
      expect(result.recordId).toBe('CLI0001');
      expect(result.isActive).toBe(true);
    });

    it('should create enterprise client under subsidiary management successfully', async () => {
      // Arrange: Enterprise client managed by consulting subsidiary
      const subsidiaryId = new Types.ObjectId().toHexString();
      const createDto: CreateClientDto = {
        name: 'Premium Apple Cooperative',
        subsidiaryId: subsidiaryId,
      };

      const expectedClient = {
        _id: new Types.ObjectId(),
        recordId: 'CLI0005',
        ...createDto,
        subsidiaryId: new Types.ObjectId(subsidiaryId),
        isActive: true,
        isDeleted: false
      };

      clientsService.create.mockResolvedValue(expectedClient as any);

      // Act: Create enterprise client
      const result = await controller.create(createDto);

      // Assert: Verify subsidiary relationship structure
      expect(result.subsidiaryId).toEqual(new Types.ObjectId(subsidiaryId));
      expect(result.name).toBe('Premium Apple Cooperative');
      expect(result.recordId).toBe('CLI0005');
    });

    it('should create international client with unicode name successfully', async () => {
      // Arrange: International orchard business
      const createDto: CreateClientDto = {
        name: 'Yamada-san りんご農園', // Japanese apple orchard
        subsidiaryId: new Types.ObjectId().toHexString(),
      };

      const expectedClient = {
        _id: new Types.ObjectId(),
        recordId: 'CLI0010',
        ...createDto,
        subsidiaryId: new Types.ObjectId(createDto.subsidiaryId),
        isActive: true,
        isDeleted: false
      };

      clientsService.create.mockResolvedValue(expectedClient as any);

      // Act: Create international client
      const result = await controller.create(createDto);

      // Assert: Verify unicode preservation
      expect(result.name).toBe('Yamada-san りんご農園');
      expect(result.recordId).toBe('CLI0010');
    });

    it('should create client without subsidiary assignment successfully', async () => {
      // Arrange: Independent client without specific subsidiary for later assignment
      const createDto: CreateClientDto = {
        name: 'Independent Grower Collective',
        // subsidiaryId omitted for independent client
      } as CreateClientDto;

      const expectedClient = {
        _id: new Types.ObjectId(),
        recordId: 'CLI0015',
        name: 'Independent Grower Collective',
        // subsidiaryId undefined for independent client  
        isActive: true,
        isDeleted: false
      };

      clientsService.create.mockResolvedValue(expectedClient as any);

      // Act: Create client without subsidiary
      const result = await controller.create(createDto);

      // Assert: Verify client created without subsidiary assignment
      expect(result.subsidiaryId).toBeUndefined();
      expect(result.name).toBe('Independent Grower Collective');
      expect(result.recordId).toBe('CLI0015');
    });

    it('should create multi-subsidiary client for complex business structure successfully', async () => {
      // Arrange: Enterprise client with complex subsidiary relationships
      const subsidiaryId = new Types.ObjectId().toHexString();
      const createDto: CreateClientDto = {
        name: 'Global Agricultural Enterprise',
        subsidiaryId: subsidiaryId,
      };

      const expectedClient = {
        _id: new Types.ObjectId(),
        recordId: 'CLI0020',
        ...createDto,
        subsidiaryId: new Types.ObjectId(subsidiaryId),
        isActive: true,
        isDeleted: false
      };

      clientsService.create.mockResolvedValue(expectedClient as any);

      // Act: Create complex enterprise client
      const result = await controller.create(createDto);

      // Assert: Verify complex business structure
      expect(result.subsidiaryId).toEqual(new Types.ObjectId(subsidiaryId));
      expect(result.name).toBe('Global Agricultural Enterprise');
      expect(result.recordId).toBe('CLI0020');
    });
  });

  describe('Client Query Endpoints', () => {
    it('should return all clients for administrator query', async () => {
      // Arrange: Administrator querying all clients
      const mockRequest = createMockRequest();
      const queryDto: QueryClientDto = {};
      
      const mockClients = [
        {
          _id: new Types.ObjectId(),
          recordId: 'CLI0001',
          name: 'Valley Vista Orchards',
          subsidiaryId: new Types.ObjectId(),
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'CLI0002',
          name: 'Mountain View Farms',
          subsidiaryId: new Types.ObjectId(),
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'CLI0003',
          name: 'Independent Grower Co-op',
          isActive: true
        }
      ];

      clientsService.findAll.mockResolvedValue(mockClients as any);

      // Act: Query all clients
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify service called with user context
      expect(clientsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(mockClients);
      expect(result).toHaveLength(3);
    });

    it('should apply query filters for client search', async () => {
      // Arrange: Filtered client query
      const mockRequest = createMockRequest();
      const queryDto: QueryClientDto = {
        name: 'Apple',
        includeInactives: false
      };

      const filteredClients = [
        {
          _id: new Types.ObjectId(),
          recordId: 'CLI0004',
          name: 'Apple Valley Orchards',
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'CLI0005',
          name: 'Red Apple Farms',
          isActive: true
        }
      ];

      clientsService.findAll.mockResolvedValue(filteredClients as any);

      // Act: Query with filters
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify filtered query passed to service
      expect(clientsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(filteredClients);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no clients match user scope', async () => {
      // Arrange: Client user with no client access
      const clientUser = {
        _id: new Types.ObjectId(),
        roleId: {
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.CLIENT_VIEW]
        }
      };
      const mockRequest = createMockRequest(clientUser.roleId);
      const queryDto: QueryClientDto = {};

      clientsService.findAll.mockResolvedValue([]);

      // Act: Query clients as limited user
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: No clients returned due to security filtering
      expect(result).toEqual([]);
      expect(clientsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
    });
  });

  describe('Individual Client Access Endpoint', () => {
    it('should return specific client by ID for administrator', async () => {
      // Arrange: Administrator accessing specific client
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      
      const mockClient = {
        _id: clientId,
        recordId: 'CLI0005',
        name: 'Premium Orchard Operations',
        subsidiaryId: new Types.ObjectId(),
        isActive: true,
        isDeleted: false
      };

      clientsService.findOne.mockResolvedValue(mockClient as any);

      // Act: Get specific client
      const result = await controller.findOne(clientId, mockRequest);

      // Assert: Verify client access with user context
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(result).toEqual(mockClient);
      expect(result.recordId).toBe('CLI0005');
    });

    it('should throw NotFoundException when client not accessible', async () => {
      // Arrange: Client not found or not accessible to user
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      clientsService.findOne.mockRejectedValue(new NotFoundException('Client not found or access denied'));

      // Act & Assert: Access denied properly handled
      await expect(controller.findOne(clientId, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
    });
  });

  describe('Client User Association Endpoint', () => {
    it('should return users assigned to specific client', async () => {
      // Arrange: Querying users for a specific client
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {};

      const mockClient = {
        _id: clientId,
        recordId: 'CLI0001',
        name: 'Valley Vista Orchards'
      };

      const mockUsers = [
        {
          _id: new Types.ObjectId(),
          recordId: 'USR001',
          name: 'John Grower',
          email: 'john@valleyvista.com',
          clientIds: [clientId],
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'USR002',
          name: 'Jane Manager',
          email: 'jane@valleyvista.com',
          clientIds: [clientId],
          isActive: true
        }
      ];

      clientsService.findOne.mockResolvedValue(mockClient as any);
      usersService.findAllByClientId.mockResolvedValue(mockUsers as any);

      // Act: Get users for client
      const result = await controller.findAllUsersForClient(clientId, queryDto, mockRequest);

      // Assert: Verify security check and user retrieval
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(usersService.findAllByClientId).toHaveBeenCalledWith(clientId, queryDto, mockRequest.user);
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should perform security check before returning client users', async () => {
      // Arrange: Client access check before user listing
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {};

      clientsService.findOne.mockRejectedValue(new NotFoundException('Client not accessible'));

      // Act & Assert: Security check prevents user access
      await expect(controller.findAllUsersForClient(clientId, queryDto, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      // Verify security check happened first
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(usersService.findAllByClientId).not.toHaveBeenCalled();
    });

    it('should apply user query filters when listing client users', async () => {
      // Arrange: Filtered user query for client
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {
        includeInactives: false,
        name: 'Manager'
      };

      const mockClient = { _id: clientId, name: 'Test Client' };
      const filteredUsers = [
        {
          _id: new Types.ObjectId(),
          name: 'Client Manager',
          clientIds: [clientId],
          isActive: true
        }
      ];

      clientsService.findOne.mockResolvedValue(mockClient as any);
      usersService.findAllByClientId.mockResolvedValue(filteredUsers as any);

      // Act: Get filtered users for client
      const result = await controller.findAllUsersForClient(clientId, queryDto, mockRequest);

      // Assert: Verify filtered query passed to users service
      expect(usersService.findAllByClientId).toHaveBeenCalledWith(clientId, queryDto, mockRequest.user);
      expect(result).toEqual(filteredUsers);
    });
  });

  describe('Client Orchard Association Endpoint', () => {
    it('should return orchards belonging to specific client', async () => {
      // Arrange: Querying orchards for a specific client
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryOrchardDto = {};

      const mockClient = {
        _id: clientId,
        recordId: 'CLI0001',
        name: 'Valley Vista Orchards'
      };

      const mockOrchards = [
        {
          _id: new Types.ObjectId(),
          recordId: 'ORC001',
          name: 'North Apple Block',
          clientId: clientId,
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'ORC002',
          name: 'South Pear Block',
          clientId: clientId,
          isActive: true
        }
      ];

      clientsService.findOne.mockResolvedValue(mockClient as any);
      orchardsService.findAllByClientId.mockResolvedValue(mockOrchards as any);

      // Act: Get orchards for client
      const result = await controller.findAllOrchardsForClient(clientId, queryOrchardDto, mockRequest);

      // Assert: Verify security check and orchard retrieval
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(orchardsService.findAllByClientId).toHaveBeenCalledWith(clientId, queryOrchardDto, mockRequest.user);
      expect(result).toEqual(mockOrchards);
      expect(result).toHaveLength(2);
    });

    it('should perform security check before returning client orchards', async () => {
      // Arrange: Client access check before orchard listing
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryOrchardDto = {};

      clientsService.findOne.mockRejectedValue(new NotFoundException('Client not accessible'));

      // Act & Assert: Security check prevents orchard access
      await expect(controller.findAllOrchardsForClient(clientId, queryOrchardDto, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      // Verify security check happened first
      expect(clientsService.findOne).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(orchardsService.findAllByClientId).not.toHaveBeenCalled();
    });

    it('should apply orchard query filters when listing client orchards', async () => {
      // Arrange: Filtered orchard query for client
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryOrchardDto = {
        includeInactives: false,
        name: 'Apple'
      };

      const mockClient = { _id: clientId, name: 'Apple Orchard Client' };
      const filteredOrchards = [
        {
          _id: new Types.ObjectId(),
          name: 'Premium Apple Block',
          clientId: clientId,
          isActive: true
        }
      ];

      clientsService.findOne.mockResolvedValue(mockClient as any);
      orchardsService.findAllByClientId.mockResolvedValue(filteredOrchards as any);

      // Act: Get filtered orchards for client
      const result = await controller.findAllOrchardsForClient(clientId, queryOrchardDto, mockRequest);

      // Assert: Verify filtered query passed to orchards service
      expect(orchardsService.findAllByClientId).toHaveBeenCalledWith(clientId, queryOrchardDto, mockRequest.user);
      expect(result).toEqual(filteredOrchards);
    });
  });

  describe('Client Update Endpoint', () => {
    it('should successfully update client information', async () => {
      // Arrange: Client information update
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateClientDto = {
        name: 'Updated Orchard Operations',
      };

      const updatedClient = {
        _id: clientId,
        recordId: 'CLI0001',
        ...updateDto,
        subsidiaryId: new Types.ObjectId(),
        isActive: true,
        isDeleted: false
      };

      clientsService.update.mockResolvedValue(updatedClient as any);

      // Act: Update client
      const result = await controller.update(clientId, updateDto, mockRequest);

      // Assert: Verify service called with proper parameters
      expect(clientsService.update).toHaveBeenCalledWith(clientId, updateDto, mockRequest.user);
      expect(result).toEqual(updatedClient);
      expect(result.name).toBe(updateDto.name);
    });

    it('should successfully update client subsidiary relationship', async () => {
      // Arrange: Client subsidiary modification
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const newSubsidiaryId = new Types.ObjectId().toHexString();
      const updateDto: UpdateClientDto = {
        subsidiaryId: newSubsidiaryId,
      };

      const updatedClient = {
        _id: clientId,
        recordId: 'CLI0002',
        name: 'Client with New Subsidiary',
        subsidiaryId: new Types.ObjectId(newSubsidiaryId),
        isActive: true
      };

      clientsService.update.mockResolvedValue(updatedClient as any);

      // Act: Update client subsidiary
      const result = await controller.update(clientId, updateDto, mockRequest);

      // Assert: Verify subsidiary relationship update
      expect(result.subsidiaryId).toEqual(new Types.ObjectId(newSubsidiaryId));
      expect(clientsService.update).toHaveBeenCalledWith(clientId, updateDto, mockRequest.user);
    });

    it('should handle client deactivation request', async () => {
      // Arrange: Client deactivation
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateClientDto = {
        isActive: false
      };

      const deactivatedClient = {
        _id: clientId,
        recordId: 'CLI0003',
        name: 'Seasonal Client',
        isActive: false
      };

      clientsService.update.mockResolvedValue(deactivatedClient as any);

      // Act: Deactivate client
      const result = await controller.update(clientId, updateDto, mockRequest);

      // Assert: Verify deactivation
      expect(result.isActive).toBe(false);
      expect(clientsService.update).toHaveBeenCalledWith(clientId, updateDto, mockRequest.user);
    });

    it('should handle mixed property updates correctly', async () => {
      // Arrange: Multiple property update for comprehensive client profile change
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateClientDto = {
        name: 'Updated Agricultural Enterprise',
        subsidiaryId: new Types.ObjectId().toHexString(),
        isActive: true
      };

      const updatedClient = {
        _id: clientId,
        recordId: 'CLI0025',
        ...updateDto,
        subsidiaryId: new Types.ObjectId(updateDto.subsidiaryId),
        isActive: true
      };

      clientsService.update.mockResolvedValue(updatedClient as any);

      // Act: Update multiple properties
      const result = await controller.update(clientId, updateDto, mockRequest);

      // Assert: Verify comprehensive update
      expect(result.name).toBe('Updated Agricultural Enterprise');
      expect(result.subsidiaryId).toEqual(new Types.ObjectId(updateDto.subsidiaryId));
      expect(result.isActive).toBe(true);
      expect(clientsService.update).toHaveBeenCalledWith(clientId, updateDto, mockRequest.user);
    });
  });

  describe('Client Deletion Endpoint', () => {
    it('should successfully delete client', async () => {
      // Arrange: Client deletion request
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletedClient = {
        _id: clientId,
        recordId: 'CLI0004',
        name: 'Client to Delete',
        isActive: false,
        isDeleted: true
      };

      clientsService.remove.mockResolvedValue(deletedClient as any);

      // Act: Delete client
      const result = await controller.remove(clientId, mockRequest);

      // Assert: Verify service call and soft deletion
      expect(clientsService.remove).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(result).toEqual(deletedClient);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should handle client deletion with relationship cleanup', async () => {
      // Arrange: Client with users and orchards being deleted
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletedClient = {
        _id: clientId,
        recordId: 'CLI0005',
        name: 'Client With Relationships',
        isActive: false,
        isDeleted: true
      };

      clientsService.remove.mockResolvedValue(deletedClient as any);

      // Act: Delete client with associated entities
      const result = await controller.remove(clientId, mockRequest);

      // Assert: Verify transactional deletion handled by service
      expect(clientsService.remove).toHaveBeenCalledWith(clientId, mockRequest.user);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should handle deletion with comprehensive relationship cleanup', async () => {
      // Arrange: Create mock request
      const mockRequest = createMockRequest();
      
      // Complex client with multiple relationships
      const complexClientId = new Types.ObjectId();
      const mockComplexClient = {
        _id: complexClientId,
        recordId: 'CLIENT_COMPLEX_001',
        name: 'Multi-Relationship Agriculture Client',
        subsidiaryId: new Types.ObjectId(),
        isActive: true,
        createdBy: mockRequest.user._id,
        modifiedBy: mockRequest.user._id
      };

      const deletedComplexClient = {
        ...mockComplexClient,
        isDeleted: true,
        isActive: false
      };

      clientsService.remove.mockResolvedValue(deletedComplexClient as any);

      // Act: Delete complex client
      const result = await controller.remove(complexClientId.toString(), mockRequest);

      // Assert: Comprehensive deletion validation
      expect(clientsService.remove).toHaveBeenCalledWith(complexClientId.toString(), mockRequest.user);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
      expect(result.recordId).toBe('CLIENT_COMPLEX_001');
      expect(result.name).toBe('Multi-Relationship Agriculture Client');
    });
  });

  describe('Controller Error Handling', () => {
    it('should propagate service exceptions for client creation failures', async () => {
      // Arrange: Service throws error during creation
      const createDto: CreateClientDto = {
        name: 'Invalid Client',
        subsidiaryId: new Types.ObjectId().toHexString(),
      };

      const serviceError = new Error('Client creation failed due to validation error');
      clientsService.create.mockRejectedValue(serviceError);

      // Act & Assert: Service error propagated
      await expect(controller.create(createDto))
        .rejects.toThrow(serviceError);
      
      expect(clientsService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate NotFoundException for invalid client access', async () => {
      // Arrange: Service throws NotFoundException
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      clientsService.findOne.mockRejectedValue(new NotFoundException('Client not found'));

      // Act & Assert: NotFoundException properly propagated
      await expect(controller.findOne(clientId, mockRequest))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle service errors during client updates', async () => {
      // Arrange: Update service throws error
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateClientDto = { name: 'Updated Name' };

      const updateError = new Error('Update failed - cannot deactivate client with active users');
      clientsService.update.mockRejectedValue(updateError);

      // Act & Assert: Update error propagated
      await expect(controller.update(clientId, updateDto, mockRequest))
        .rejects.toThrow(updateError);
      
      expect(clientsService.update).toHaveBeenCalledWith(clientId, updateDto, mockRequest.user);
    });

    it('should handle service errors during client deletion', async () => {
      // Arrange: Deletion service throws error
      const clientId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletionError = new Error('Cannot delete client - active orchards exist');
      clientsService.remove.mockRejectedValue(deletionError);

      // Act & Assert: Deletion error propagated
      await expect(controller.remove(clientId, mockRequest))
        .rejects.toThrow(deletionError);
      
      expect(clientsService.remove).toHaveBeenCalledWith(clientId, mockRequest.user);
    });
  });

  describe('HTTP Request/Response Integration', () => {
    it('should properly extract user context from request', async () => {
      // Arrange: Request with user context
      const mockRequest = createMockRequest();
      const queryDto: QueryClientDto = {};

      clientsService.findAll.mockResolvedValue([]);

      // Act: Call endpoint with user context
      await controller.findAll(queryDto, mockRequest);

      // Assert: User context passed to service
      expect(clientsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
    });

    it('should handle MongoDB ObjectId parameter parsing', async () => {
      // Arrange: Valid ObjectId parameter
      const validObjectId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const mockClient = {
        _id: validObjectId,
        recordId: 'CLI0001',
        name: 'Test Client'
      };

      clientsService.findOne.mockResolvedValue(mockClient as any);

      // Act: Access client with ObjectId parameter
      const result = await controller.findOne(validObjectId, mockRequest);

      // Assert: ObjectId properly parsed and used
      expect(clientsService.findOne).toHaveBeenCalledWith(validObjectId, mockRequest.user);
      expect((result as any)._id).toBe(validObjectId);
    });

    it('should properly handle query parameters for filtering', async () => {
      // Arrange: Request with query parameters
      const mockRequest = createMockRequest();
      const queryDto: QueryClientDto = {
        name: 'Apple',
        includeInactives: false
      };

      const filteredClients = [
        {
          _id: new Types.ObjectId(),
          name: 'Apple Valley Orchards',
          isActive: true
        }
      ];

      clientsService.findAll.mockResolvedValue(filteredClients as any);

      // Act: Query with parameters
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Query parameters properly passed to service
      expect(clientsService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(filteredClients);
    });
  });
});
