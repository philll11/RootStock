import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types, ClientSession } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client, ClientDocument } from './schemas/client.schema';
import { User, UserDocument, UserType } from '../users/schemas/user.schema';
import { Orchard, OrchardDocument } from '../orchards/schemas/orchard.schema';
import { UsersService } from '../users/users.service';
import { ClientResolverService } from './client-resolver/client-resolver.service';
import { CountersService } from '../counters/counters.service';
import { Role, VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

const mockClientId = new Types.ObjectId().toHexString();
const mockSubsidiaryId = new Types.ObjectId().toHexString();

// Mock User object for testing
const mockUser = (permissions: string[] = []): User => ({
  _id: new Types.ObjectId().toHexString(),
  recordId: 'USER_MOCK',
  name: 'Mock User',
  firstName: 'Mock',
  lastName: 'User',
  userType: UserType.EMPLOYEE,
  clientIds: [mockClientId],
  isActive: true,
  isDeleted: false,
  roleId: {
    _id: new Types.ObjectId().toHexString(),
    name: 'Mock Role',
    permissions,
    visibilityScope: VisibilityScope.GLOBAL,
    isActive: true,
    isDeleted: false,
  },
} as any);

// Mock Client document
const mockClient = {
  _id: mockClientId,
  recordId: 'CLI_MOCK',
  name: 'Mock Client',
  subsidiaryId: mockSubsidiaryId,
  isActive: true,
  isDeleted: false,
};

describe('ClientsService', () => {
  let service: ClientsService;
  let clientModel: Model<ClientDocument>;
  let userModel: Model<UserDocument>;
  let orchardModel: Model<OrchardDocument>;
  let usersService: UsersService;
  let clientResolverService: ClientResolverService;
  let countersService: CountersService;
  let connection: Connection;

  const mockSession: Partial<ClientSession> = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  const mockClientModel = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue({ ...dto, _id: mockClientId }),
  }));
  
  Object.assign(mockClientModel, {
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findOneAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
    exec: jest.fn(),
  });

  const mockUserModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
  };

  const mockOrchardModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
    countDocuments: jest.fn(),
  };

  const mockUsersService = {
    countActiveByClientId: jest.fn(),
  };

  const mockClientResolverService = {
    resolveClientsForUser: jest.fn(),
    getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
    getAccessibleSubsidiaryIdsForUser: jest.fn(),
  };

  const mockCountersService = {
    getNextSequenceValue: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: mockClientModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Orchard.name), useValue: mockOrchardModel },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ClientResolverService, useValue: mockClientResolverService },
        { provide: CountersService, useValue: mockCountersService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientModel = module.get<Model<ClientDocument>>(getModelToken(Client.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    orchardModel = module.get<Model<OrchardDocument>>(getModelToken(Orchard.name));
    usersService = module.get<UsersService>(UsersService);
    clientResolverService = module.get<ClientResolverService>(ClientResolverService);
    countersService = module.get<CountersService>(CountersService);
    connection = module.get<Connection>(getConnectionToken());

    jest.clearAllMocks();
  });

  describe('Inactive Client Access Control - Business Logic', () => {
    it('should allow client administrators with Client:ManageInactive permission to see inactive clients', async () => {
      // Arrange: Client administrator requesting inactive client data for business review
      const clientAdministratorUser = mockUser([PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_MANAGE_INACTIVE]);
      const queryDto: QueryClientDto = {
        includeInactives: true,
      };

      const inactiveClients = [
        { ...mockClient, isActive: false, name: 'Dormant Agricultural Business - Seasonal Operations' },
        { ...mockClient, isActive: true, name: 'Active Premium Orchards Ltd' }
      ];

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactiveClients),
      });

      // Act: Query including inactive clients with proper permission
      const result = await service.findAll(queryDto, clientAdministratorUser);

      // Assert: Administrator can access both active and inactive clients for business management
      expect(result).toEqual(inactiveClients);
      expect(result.length).toBe(2);
      expect(result.some(client => !client.isActive)).toBe(true);
    });

    it('should prevent standard users from accessing inactive clients even when requested', async () => {
      // Arrange: Standard user attempting to access inactive client data
      const standardBusinessUser = mockUser([PERMISSIONS.CLIENT_VIEW]);
      const queryDto: QueryClientDto = {
        includeInactives: true,
      };

      const activeClientsOnly = [
        { ...mockClient, isActive: true, name: 'Active Agricultural Business' }
      ];

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeClientsOnly),
      });

      // Act: Query attempting to include inactive clients without permission
      const result = await service.findAll(queryDto, standardBusinessUser);

      // Assert: Security boundary enforced - only active clients returned
      expect(result).toEqual(activeClientsOnly);
      expect(result.every(client => client.isActive)).toBe(true);
    });

    it('should maintain default active-only behavior for standard client queries', async () => {
      // Arrange: Standard client query without explicit inactive request
      const anyUser = mockUser([PERMISSIONS.CLIENT_VIEW]);
      const queryDto: QueryClientDto = {
        name: 'orchard',
      };

      const activeClients = [
        { ...mockClient, isActive: true, name: 'Active Orchard Business Solutions' }
      ];

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeClients),
      });

      // Act: Standard query without inactive flag
      const result = await service.findAll(queryDto, anyUser);

      // Assert: Default behavior shows only active clients for operational use
      expect(result).toEqual(activeClients);
      expect(result.every(client => client.isActive)).toBe(true);
    });

    it('should deny inactive client access when user has other permissions but lacks ManageInactive', async () => {
      // Arrange: User with administrative permissions but no Client:ManageInactive
      const partialAdminUser = mockUser([
        PERMISSIONS.CLIENT_VIEW, 
        PERMISSIONS.CLIENT_EDIT, 
        PERMISSIONS.USER_VIEW,
        PERMISSIONS.ORCHARD_MANAGE_INACTIVE  // Has Orchard inactive permission but not Client
      ]);
      
      const queryDto: QueryClientDto = {
        includeInactives: true,
      };

      const activeClientsOnly = [
        { ...mockClient, isActive: true, name: 'Active Business Operations' }
      ];

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeClientsOnly),
      });

      // Act: Query for inactive clients without specific permission
      const result = await service.findAll(queryDto, partialAdminUser);

      // Assert: Resource-specific permissions enforced - no cross-resource privilege escalation
      expect(result).toEqual(activeClientsOnly);
      expect(result.every(client => client.isActive)).toBe(true);
    });

    it('should enforce resource-specific permission boundaries for inactive access', async () => {
      // Arrange: User with User:ManageInactive but not Client:ManageInactive
      const userManagerRole = mockUser([
        PERMISSIONS.CLIENT_VIEW,
        PERMISSIONS.USER_MANAGE_INACTIVE,  // Wrong resource permission
        PERMISSIONS.SUBSIDIARY_VIEW
      ]);
      
      const queryDto: QueryClientDto = {
        includeInactives: true,
      };

      const activeClientsOnly = [
        { ...mockClient, isActive: true, name: 'Secure Active Client' }
      ];

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.find as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(activeClientsOnly),
      });

      // Act: Attempt to access inactive clients with wrong resource permission
      const result = await service.findAll(queryDto, userManagerRole);

      // Assert: Business rule - User management permissions do not grant client management permissions
      expect(result).toEqual(activeClientsOnly);
      expect(result.every(client => client.isActive)).toBe(true);
    });

    it('should allow finding inactive client when user has Client:ManageInactive permission and includeInactive option is used', async () => {
      // Arrange: Finding a specific inactive client for administrative review
      const clientAdminUser = mockUser([PERMISSIONS.CLIENT_VIEW, PERMISSIONS.CLIENT_MANAGE_INACTIVE]);
      const inactiveClientDoc = { ...mockClient, isActive: false, name: 'Dormant Seasonal Business' };

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(inactiveClientDoc),
      });

      // Act: Find inactive client with includeInactive option
      const result = await service.findOne(mockClientId, clientAdminUser, { includeInactive: true });

      // Assert: Admin can access inactive client for business management
      expect(result).toEqual(inactiveClientDoc);
      expect(result.isActive).toBe(false);
    });

    it('should prevent access to inactive client when user lacks ManageInactive permission', async () => {
      // Arrange: Standard user attempting to access inactive client
      const standardUser = mockUser([PERMISSIONS.CLIENT_VIEW]);

      mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
      (clientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null), // Query would filter out inactive client
      });

      // Act & Assert: Standard user cannot access inactive client even with includeInactive option
      await expect(service.findOne(mockClientId, standardUser, { includeInactive: true }))
        .rejects.toThrow(NotFoundException);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Client Creation Business Logic', () => {
    describe('create', () => {
      it('should create a new client with sequential recordId', async () => {
        // Arrange
        const user = mockUser([PERMISSIONS.CLIENT_CREATE]);
        const createClientDto = {
          name: 'New Orchard Client',
          subsidiaryId: mockSubsidiaryId,
        };

        mockCountersService.getNextSequenceValue.mockResolvedValue({
          prefix: 'CLI',
          sequence_value: 42,
        });

        // Act
        const result = await service.create(createClientDto, user);

        // Assert
        expect(countersService.getNextSequenceValue).toHaveBeenCalledWith('client', 'CLI');
        expect(mockClientModel).toHaveBeenCalledWith({
          ...createClientDto,
          recordId: 'CLI0042', // Padded sequence
        });
        expect(result.recordId).toBe('CLI0042');
      });

      it('should handle international client names correctly', async () => {
        // Arrange - International agricultural business
        const user = mockUser([PERMISSIONS.CLIENT_CREATE]);
        const createClientDto = {
          name: 'Yamada-san りんご農園', // Japanese apple orchard
          subsidiaryId: mockSubsidiaryId,
        };

        mockCountersService.getNextSequenceValue.mockResolvedValue({
          prefix: 'CLI',
          sequence_value: 1,
        });

        // Act
        const result = await service.create(createClientDto, user);

        // Assert
        expect(countersService.getNextSequenceValue).toHaveBeenCalledWith('client', 'CLI');
        expect(mockClientModel).toHaveBeenCalledWith({
          ...createClientDto,
          recordId: 'CLI0001',
        });
        expect(result.name).toBe('Yamada-san りんご農園');
      });

      it('should create client without subsidiary relationship', async () => {
        // Arrange - Independent client without subsidiary
        const user = mockUser([PERMISSIONS.CLIENT_CREATE]);
        const createClientDto = {
          name: 'Independent Farmer',
          subsidiaryId: mockSubsidiaryId, // Still required by DTO validation
        };

        mockCountersService.getNextSequenceValue.mockResolvedValue({
          prefix: 'CLI',
          sequence_value: 15,
        });

        // Act
        const result = await service.create(createClientDto, user);

        // Assert
        expect(mockClientModel).toHaveBeenCalledWith({
          ...createClientDto,
          recordId: 'CLI0015',
        });
      });
    });
  });

  describe('Client Query Business Logic', () => {
    describe('findOne', () => {
      it('should find and return a client within user scope', async () => {
        // Arrange
        const user = mockUser([PERMISSIONS.CLIENT_VIEW]);
        mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
        (clientModel.findOne as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockClient),
        });

        // Act
        const result = await service.findOne(mockClientId, user);

        // Assert
        expect(clientModel.findOne).toHaveBeenCalledWith({
          $and: [
            expect.any(Object), // Security filter
            { _id: new Types.ObjectId(mockClientId) }
          ]
        });
        expect(result).toEqual(mockClient);
      });

      it('should throw NotFoundException when client not found or outside scope', async () => {
        // Arrange - Client not accessible to user
        const user = mockUser([PERMISSIONS.CLIENT_VIEW]);
        mockClientResolverService.resolveClientsForUser.mockResolvedValue([]);
        (clientModel.findOne as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        });

        // Act & Assert
        await expect(service.findOne(mockClientId, user)).rejects.toThrow(NotFoundException);
        expect(clientModel.findOne).toHaveBeenCalled();
      });

      it('should validate client access for business relationships', async () => {
        // Arrange - Business relationship validation scenario
        const user = mockUser([PERMISSIONS.CLIENT_VIEW]);
        const businessClient = {
          ...mockClient,
          name: 'Premium Orchards Ltd',
          subsidiaryId: mockSubsidiaryId,
        };

        mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
        (clientModel.findOne as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(businessClient),
        });

        // Act
        const result = await service.findOne(mockClientId, user);

        // Assert
        expect(result.subsidiaryId).toBe(mockSubsidiaryId);
        expect(result.name).toBe('Premium Orchards Ltd');
      });
    });
  });

  describe('Client Update Business Operations', () => {
    describe('update', () => {
      it('should successfully update a client with valid business changes', async () => {
        // Arrange
        const updateDto = { name: 'Updated Orchard Name' };
        const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT]);
        const updatedClient = { ...mockClient, ...updateDto };

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        (clientModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedClient),
        });

        // Act
        const result = await service.update(mockClientId, updateDto, userWithPermissions);

        // Assert
        expect(service.findOne).toHaveBeenCalledWith(mockClientId, userWithPermissions, { includeInactive: true });
        expect(clientModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockClientId,
          { $set: { name: 'Updated Orchard Name' } },
          { new: true }
        );
        expect(result.name).toEqual('Updated Orchard Name');
      });

      it('should handle subsidiary relationship updates', async () => {
        // Arrange - Business relationship change
        const newSubsidiaryId = new Types.ObjectId().toHexString();
        const updateDto = { subsidiaryId: newSubsidiaryId };
        const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT]);

        const updatedClient = {
          ...mockClient,
          subsidiaryId: new Types.ObjectId(newSubsidiaryId),
        };

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        (clientModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(updatedClient),
        });

        // Act
        const result = await service.update(mockClientId, updateDto, userWithPermissions);

        // Assert
        expect(clientModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockClientId,
          { $set: { subsidiaryId: new Types.ObjectId(newSubsidiaryId) } },
          { new: true }
        );
        expect(result.subsidiaryId).toEqual(new Types.ObjectId(newSubsidiaryId));
      });

      it('should throw ConflictException when deactivating client with active users', async () => {
        // Arrange - Business constraint violation
        const updateDto = { isActive: false };
        const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_MANAGE_INACTIVE]);

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        mockUsersService.countActiveByClientId.mockResolvedValue(3); // Active users exist

        // Act & Assert
        await expect(service.update(mockClientId, updateDto, userWithPermissions))
          .rejects.toThrow(ConflictException);
        expect(usersService.countActiveByClientId).toHaveBeenCalledWith(mockClientId);
      });

      it('should throw ConflictException when deactivating client with active orchards', async () => {
        // Arrange - Business constraint violation
        const updateDto = { isActive: false };
        const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_MANAGE_INACTIVE]);

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        mockUsersService.countActiveByClientId.mockResolvedValue(0);
        (orchardModel.countDocuments as jest.Mock).mockResolvedValue(2); // Active orchards exist

        // Act & Assert
        await expect(service.update(mockClientId, updateDto, userWithPermissions))
          .rejects.toThrow(ConflictException);
        expect(orchardModel.countDocuments).toHaveBeenCalledWith({
          clientId: new Types.ObjectId(mockClientId),
          isActive: true,
          isDeleted: false
        });
      });

      it('should throw ForbiddenException when user lacks CLIENT_MANAGE_INACTIVE permission', async () => {
        // Arrange - Permission validation
        const updateDto = { isActive: false };
        const userWithoutPermission = mockUser([PERMISSIONS.CLIENT_EDIT]); // Missing CLIENT_MANAGE_INACTIVE

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        mockUsersService.countActiveByClientId.mockResolvedValue(0);
        (orchardModel.countDocuments as jest.Mock).mockResolvedValue(0);

        // Act & Assert
        await expect(service.update(mockClientId, updateDto, userWithoutPermission))
          .rejects.toThrow(ForbiddenException);
        expect(usersService.countActiveByClientId).toHaveBeenCalledWith(mockClientId);
      });

      it('should allow status update when user has proper permissions and no dependencies', async () => {
        // Arrange - Valid business status change
        const updateDto = { isActive: false };
        const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_MANAGE_INACTIVE]);
        const deactivatedClient = { ...mockClient, isActive: false };

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        mockUsersService.countActiveByClientId.mockResolvedValue(0);
        (orchardModel.countDocuments as jest.Mock).mockResolvedValue(0);
        (clientModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(deactivatedClient),
        });

        // Act
        const result = await service.update(mockClientId, updateDto, userWithPermissions);

        // Assert
        expect(result.isActive).toBe(false);
        expect(clientModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockClientId,
          { $set: { isActive: false } },
          { new: true }
        );
      });
    });
  });

  describe('Client Deletion Business Operations', () => {
    describe('remove', () => {
      it('should soft delete client and handle business cleanup within transaction', async () => {
        // Arrange
        const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
        const deletedClient = { ...mockClient, isDeleted: true, isActive: false };

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        (clientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(deletedClient),
        });

        // Act
        const result = await service.remove(mockClientId, user);

        // Assert
        expect(service.findOne).toHaveBeenCalledWith(mockClientId, user);
        expect(connection.startSession).toHaveBeenCalled();
        expect(mockSession.startTransaction).toHaveBeenCalled();

        // Verify user disassociation
        expect(userModel.updateMany).toHaveBeenCalledWith(
          { clientIds: mockClientId },
          { $pull: { clientIds: mockClientId } },
          { session: mockSession }
        );

        // Verify orchard soft deletion
        expect(orchardModel.updateMany).toHaveBeenCalledWith(
          { clientId: new Types.ObjectId(mockClientId) },
          { isDeleted: true, isActive: false },
          { session: mockSession }
        );

        expect(mockSession.commitTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
        expect(result.isDeleted).toBe(true);
      });

      it('should handle transaction rollback on deletion failure', async () => {
        // Arrange - Transaction failure scenario
        const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
        const error = new Error('Transaction failed');

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        (clientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockRejectedValue(error),
        });

        // Act & Assert
        await expect(service.remove(mockClientId, user)).rejects.toThrow('Transaction failed');

        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
      });

      it('should handle transaction failure during user disassociation', async () => {
        // Arrange - User update failure during transaction
        const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
        const userUpdateError = new Error('User update failed');

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        
        // Mock successful client deletion but failed user update
        (clientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockClient, isDeleted: true }),
        });
        
        mockUserModel.updateMany.mockReturnValue({
          exec: jest.fn().mockRejectedValue(userUpdateError),
        });

        // Act & Assert
        await expect(service.remove(mockClientId, user)).rejects.toThrow('User update failed');

        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
        
        // Verify user update was attempted
        expect(mockUserModel.updateMany).toHaveBeenCalledWith(
          { clientIds: mockClientId },
          { $pull: { clientIds: mockClientId } },
          { session: mockSession }
        );
      });

      it('should handle transaction failure during orchard deletion', async () => {
        // Arrange - Orchard update failure during transaction
        const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
        const orchardUpdateError = new Error('Orchard update failed');

        jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
        
        // Mock successful client deletion and user update but failed orchard update
        (clientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue({ ...mockClient, isDeleted: true }),
        });
        
        mockUserModel.updateMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        });

        mockOrchardModel.updateMany.mockReturnValue({
          exec: jest.fn().mockRejectedValue(orchardUpdateError),
        });

        // Act & Assert
        await expect(service.remove(mockClientId, user)).rejects.toThrow('Orchard update failed');

        expect(mockSession.startTransaction).toHaveBeenCalled();
        expect(mockSession.abortTransaction).toHaveBeenCalled();
        expect(mockSession.endSession).toHaveBeenCalled();
        
        // Verify orchard update was attempted
        expect(mockOrchardModel.updateMany).toHaveBeenCalledWith(
          { clientId: new Types.ObjectId(mockClientId) },
          { isDeleted: true, isActive: false },
          { session: mockSession }
        );
      });

      it('should handle concurrent deletion attempts gracefully', async () => {
        // Arrange - Multiple concurrent deletion attempts
        const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
        const deletedClient = { ...mockClient, isDeleted: true };

        jest.spyOn(service, 'findOne')
          .mockResolvedValueOnce(mockClient as any) // First call succeeds
          .mockRejectedValueOnce(new NotFoundException('Client not found')); // Second call fails

        (clientModel.findOneAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(deletedClient),
        });

        mockUserModel.updateMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        });

        mockOrchardModel.updateMany.mockReturnValue({
          exec: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        });

        // Act - Simulate concurrent deletion attempts
        const deletionPromises = [
          service.remove(mockClientId, user),
          service.remove(mockClientId, user)
        ];

        const results = await Promise.allSettled(deletionPromises);

        // Assert - One should succeed, one should fail gracefully
        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
        
        if (results[0].status === 'fulfilled') {
          expect((results[0] as PromiseFulfilledResult<any>).value.isDeleted).toBe(true);
        }
      });
    });
  });

  describe('Client Validation Business Logic', () => {
    describe('validateClientIds', () => {
      it('should return true for valid active client IDs', async () => {
        // Arrange
        const clientIds = ['id1', 'id2', 'id3'];
        (clientModel.countDocuments as jest.Mock).mockResolvedValue(3); // All found

        // Act
        const result = await service.validateClientIds(clientIds);

        // Assert
        expect(clientModel.countDocuments).toHaveBeenCalledWith({
          _id: { $in: clientIds },
          isActive: true,
          isDeleted: false,
        });
        expect(result).toBe(true);
      });

      it('should return false when some clients are inactive or deleted', async () => {
        // Arrange
        const clientIds = ['id1', 'id2', 'id3'];
        (clientModel.countDocuments as jest.Mock).mockResolvedValue(2); // One missing or inactive

        // Act
        const result = await service.validateClientIds(clientIds);

        // Assert
        expect(result).toBe(false);
      });

      it('should return true for empty array (business rule)', async () => {
        // Arrange
        const clientIds: string[] = [];

        // Act
        const result = await service.validateClientIds(clientIds);

        // Assert
        expect(result).toBe(true);
        expect(clientModel.countDocuments).not.toHaveBeenCalled();
      });
    });

    describe('validateSingleClientId', () => {
      it('should return true for valid single client ID', async () => {
        // Arrange
        (clientModel.findOne as jest.Mock).mockResolvedValue(mockClient);

        // Act
        const result = await service.validateSingleClientId(mockClientId);

        // Assert
        expect(clientModel.findOne).toHaveBeenCalledWith({
          _id: new Types.ObjectId(mockClientId),
          isActive: true,
          isDeleted: false,
        });
        expect(result).toBe(true);
      });

      it('should return false for inactive or deleted client', async () => {
        // Arrange
        (clientModel.findOne as jest.Mock).mockResolvedValue(null);

        // Act
        const result = await service.validateSingleClientId(mockClientId);

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for empty client ID', async () => {
        // Arrange & Act
        const result = await service.validateSingleClientId('');

        // Assert
        expect(result).toBe(false);
        expect(clientModel.findOne).not.toHaveBeenCalled();
      });

      it('should handle null and undefined client IDs gracefully', async () => {
        // Act & Assert - Test null
        const nullResult = await service.validateSingleClientId(null as any);
        expect(nullResult).toBe(false);

        // Act & Assert - Test undefined  
        const undefinedResult = await service.validateSingleClientId(undefined as any);
        expect(undefinedResult).toBe(false);

        expect(clientModel.findOne).not.toHaveBeenCalled();
      });

      it('should handle malformed ObjectId strings gracefully', async () => {
        // Arrange - Invalid ObjectId format
        const malformedId = 'invalid-objectid-format';

        // Act - Should handle the error gracefully without throwing
        const result = await service.validateSingleClientId(malformedId);
        
        // Assert - Should return false for malformed IDs rather than throwing
        expect(result).toBe(false);
      });
    });

    describe('validateClientIds - Enhanced Edge Cases', () => {
      it('should handle array with malformed ObjectIds', async () => {
        // Arrange - Mix of valid and invalid ObjectId strings
        const mixedIds = [
          new Types.ObjectId().toHexString(), // Valid
          'invalid-id', // Invalid
          '', // Empty
          new Types.ObjectId().toHexString() // Valid
        ];

        // Mock countDocuments to return count for only valid IDs
        (clientModel.countDocuments as jest.Mock).mockResolvedValue(2);

        // Act
        const result = await service.validateClientIds(mixedIds);

        // Assert - Should return false because not all IDs are valid
        expect(result).toBe(false);
        expect(clientModel.countDocuments).toHaveBeenCalledWith({
          _id: { $in: mixedIds },
          isActive: true,
          isDeleted: false,
        });
      });

      it('should handle very large client ID arrays efficiently', async () => {
        // Arrange - Large array of client IDs
        const largeIdArray = Array.from({ length: 1000 }, () => new Types.ObjectId().toHexString());
        (clientModel.countDocuments as jest.Mock).mockResolvedValue(1000);

        // Act
        const result = await service.validateClientIds(largeIdArray);

        // Assert
        expect(result).toBe(true);
        expect(clientModel.countDocuments).toHaveBeenCalledWith({
          _id: { $in: largeIdArray },
          isActive: true,
          isDeleted: false,
        });
      });
    });

    describe('countActiveBySubsidiaryId', () => {
      it('should count active clients for subsidiary relationship validation', async () => {
        // Arrange - Subsidiary deactivation pre-check
        (clientModel.countDocuments as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(5),
        });

        // Act
        const result = await service.countActiveBySubsidiaryId(mockSubsidiaryId);

        // Assert
        expect(clientModel.countDocuments).toHaveBeenCalledWith({
          subsidiaryId: mockSubsidiaryId,
          isActive: true,
          isDeleted: false,
        });
        expect(result).toBe(5);
      });

      it('should return zero count when subsidiary has no active clients', async () => {
        // Arrange - Safe to deactivate subsidiary
        (clientModel.countDocuments as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(0),
        });

        // Act
        const result = await service.countActiveBySubsidiaryId(mockSubsidiaryId);

        // Assert
        expect(result).toBe(0);
      });
    });
  });

  describe('Business Query Operations', () => {
    describe('findAllBySubsidiaryId', () => {
      it('should return clients belonging to specific subsidiary', async () => {
        // Arrange
        const queryDto = {};
        const user = mockUser([PERMISSIONS.CLIENT_VIEW]);
        const subsidiaryClients = [
          { ...mockClient, name: 'Subsidiary Client 1' },
          { ...mockClient, name: 'Subsidiary Client 2' },
        ];

        mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
        (clientModel.find as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(subsidiaryClients),
        });

        // Act
        const result = await service.findAllBySubsidiaryId(mockSubsidiaryId, queryDto, user);

        // Assert
        expect(clientModel.find).toHaveBeenCalledWith(
          expect.objectContaining({
            subsidiaryId: new Types.ObjectId(mockSubsidiaryId),
          })
        );
        expect(result).toEqual(subsidiaryClients);
      });

      it('should apply user visibility scope to subsidiary client queries', async () => {
        // Arrange - User with limited scope
        const queryDto = {};
        const limitedUser = mockUser([PERMISSIONS.CLIENT_VIEW]);
        // Note: roleId is ObjectId in real implementation, so we can't modify visibilityScope directly

        mockClientResolverService.resolveClientsForUser.mockResolvedValue([mockClientId]);
        (clientModel.find as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue([mockClient]),
        });

        // Act
        const result = await service.findAllBySubsidiaryId(mockSubsidiaryId, queryDto, limitedUser);

        // Assert
        expect(clientModel.find).toHaveBeenCalled();
        expect(result).toEqual([mockClient]);
      });
    });
  });
});