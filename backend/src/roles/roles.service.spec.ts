import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';

import { RolesService } from './roles.service';
import { Role, RoleDocument, VisibilityScope } from './schemas/role.schema';
import { User, UserDocument, UserType } from '../users/schemas/user.schema';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';
import { UsersService } from '../users/users.service';
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
    permissions: [PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_EDIT],
    isActive: true,
    isDeleted: false,
  }
} as any);

describe('RolesService', () => {
  let service: RolesService;
  let roleModel: jest.Mocked<Model<RoleDocument>>;
  let userModel: jest.Mocked<Model<UserDocument>>;
  let connection: jest.Mocked<Connection>;
  let clientResolverService: jest.Mocked<ClientResolverService>;
  let usersService: jest.Mocked<UsersService>;
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
    const mockRoleModel = {
      find: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      countDocuments: jest.fn(),
      // Constructor function for new documents
    } as any;
    
    // Make the model itself callable as a constructor
    const roleModelConstructor = jest.fn().mockImplementation((data) => ({
      ...data,
      save: jest.fn().mockResolvedValue({ ...data, _id: new Types.ObjectId() })
    }));
    
    // Add static methods to constructor
    Object.assign(roleModelConstructor, mockRoleModel);

    const mockUserModel = {
      updateMany: jest.fn(),
    } as any;

    const mockConnection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    const mockClientResolverService = {} as any;
    
    const mockUsersService = {
      countActiveByRoleId: jest.fn(),
    };

    const mockCountersService = {
      getNextSequenceValue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getModelToken(Role.name), useValue: roleModelConstructor },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getConnectionToken(), useValue: mockConnection },
        { provide: ClientResolverService, useValue: mockClientResolverService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: CountersService, useValue: mockCountersService },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    roleModel = module.get(getModelToken(Role.name));
    userModel = module.get(getModelToken(User.name));
    connection = module.get(getConnectionToken());
    clientResolverService = module.get(ClientResolverService);
    usersService = module.get(UsersService);
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

  describe('Role Creation Business Logic', () => {
    it('should create role with sequential recordId', async () => {
      // Arrange: Role creation with counter service
      const createDto: CreateRoleDto = {
        name: 'System Administrator',
        description: 'Full system access',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_CREATE, PERMISSIONS.CLIENT_CREATE]
      };

      const counterResult = { _id: 'role', prefix: 'ROL', sequence_value: 5 };
      countersService.getNextSequenceValue.mockResolvedValue(counterResult);

      const expectedRole = {
        ...createDto,
        recordId: 'ROL0005',
        _id: new Types.ObjectId(),
        isActive: true,
        isDeleted: false
      };

      (roleModel as any).mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(expectedRole)
      }));

      // Act: Create role
      const result = await service.create(createDto);

      // Assert: Verify business logic
      expect(countersService.getNextSequenceValue).toHaveBeenCalledWith('role', 'ROL');
      expect(result.recordId).toBe('ROL0005');
      expect(result.name).toBe(createDto.name);
      expect(result.visibilityScope).toBe(createDto.visibilityScope);
    });

    it('should create role with proper default values', async () => {
      // Arrange: Role creation with minimal data
      const createDto: CreateRoleDto = {
        name: 'Basic Role',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: []
      };

      countersService.getNextSequenceValue.mockResolvedValue({ _id: 'role', prefix: 'ROL', sequence_value: 1 });

      const expectedRole = {
        ...createDto,
        recordId: 'ROL0001',
        _id: new Types.ObjectId()
      };

      (roleModel as any).mockImplementation((data) => ({
        ...data,
        save: jest.fn().mockResolvedValue(expectedRole)
      }));

      // Act: Create role
      const result = await service.create(createDto);

      // Assert: Verify defaults applied
      expect(result.recordId).toBe('ROL0001');
      expect(result.permissions).toEqual([]);
    });
  });

  describe('Role Query Business Logic', () => {
    it('should apply security filter for role queries', async () => {
      // Arrange: Query with user context
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const queryDto: QueryRoleDto = {};
      const mockRoles = [
        { _id: new Types.ObjectId(), name: 'Admin Role', visibilityScope: VisibilityScope.GLOBAL },
        { _id: new Types.ObjectId(), name: 'Client Role', visibilityScope: VisibilityScope.CLIENT }
      ];

      roleModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRoles)
      });

      // Act: Query roles
      const result = await service.findAll(queryDto, globalUser);

      // Assert: Verify query executed
      expect(roleModel.find).toHaveBeenCalled();
      expect(result).toEqual(mockRoles);
    });

    it('should prevent non-global users from seeing roles', async () => {
      // Arrange: Non-global user querying roles
      const clientUser = createMockUser(VisibilityScope.CLIENT);
      const queryDto: QueryRoleDto = {};

      roleModel.find = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]) // Empty result due to security filter
      });

      // Act: Query roles as client-scoped user
      const result = await service.findAll(queryDto, clientUser);

      // Assert: No roles returned for non-global user
      expect(result).toEqual([]);
      expect(roleModel.find).toHaveBeenCalled();
    });
  });

  describe('Individual Role Access Business Logic', () => {
    it('should find role by ID with security check', async () => {
      // Arrange: Valid role lookup
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const mockRole = {
        _id: roleId,
        name: 'Test Role',
        visibilityScope: VisibilityScope.GLOBAL,
        isActive: true,
        isDeleted: false
      };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRole)
      });

      // Act: Find role by ID
      const result = await service.findOne(roleId, globalUser);

      // Assert: Role found successfully
      expect(result).toEqual(mockRole);
      expect(roleModel.findOne).toHaveBeenCalledWith({
        $and: [
          expect.any(Object), // Security filter
          { _id: new Types.ObjectId(roleId) }
        ]
      });
    });

    it('should throw NotFoundException when role not found or unauthorized', async () => {
      // Arrange: Role not found or user lacks access
      const clientUser = createMockUser(VisibilityScope.CLIENT);
      const roleId = new Types.ObjectId().toHexString();

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null)
      });

      // Act & Assert: Access denied
      await expect(service.findOne(roleId, clientUser))
        .rejects.toThrow(NotFoundException);
      expect(roleModel.findOne).toHaveBeenCalled();
    });
  });

  describe('Role Update Business Rules', () => {
    it('should successfully update role information', async () => {
      // Arrange: Standard role update
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const updateDto: UpdateRoleDto = {
        name: 'Updated Role Name',
        description: 'Updated description'
      };

      const existingRole = {
        _id: roleId,
        name: 'Original Role',
        visibilityScope: VisibilityScope.GLOBAL,
        isActive: true
      };

      const updatedRole = { ...existingRole, ...updateDto };

      // Mock findOne for security check
      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      // Mock update operation
      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedRole)
      });

      // Act: Update role
      const result = await service.update(roleId, updateDto, globalUser);

      // Assert: Role updated successfully
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
      expect(roleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        roleId,
        { $set: updateDto },
        { new: true }
      );
    });

    it('should prevent role deactivation when active users exist', async () => {
      // Arrange: Role with active users cannot be deactivated
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const updateDto: UpdateRoleDto = { isActive: false };

      const existingRole = {
        _id: roleId,
        name: 'Role with Users',
        isActive: true
      };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      usersService.countActiveByRoleId.mockResolvedValue(3); // 3 active users

      // Act & Assert: Deactivation blocked
      await expect(service.update(roleId, updateDto, globalUser))
        .rejects.toThrow(ConflictException);
      
      expect(usersService.countActiveByRoleId).toHaveBeenCalledWith(roleId);
      expect(roleModel.findByIdAndUpdate).not.toHaveBeenCalled();
    });

    it('should allow role deactivation when no active users exist', async () => {
      // Arrange: Role with no active users can be deactivated
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const updateDto: UpdateRoleDto = { isActive: false };

      const existingRole = {
        _id: roleId,
        name: 'Role without Users',
        isActive: true
      };

      const deactivatedRole = { ...existingRole, isActive: false };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      usersService.countActiveByRoleId.mockResolvedValue(0); // No active users

      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deactivatedRole)
      });

      // Act: Deactivate role
      const result = await service.update(roleId, updateDto, globalUser);

      // Assert: Role successfully deactivated
      expect(result.isActive).toBe(false);
      expect(usersService.countActiveByRoleId).toHaveBeenCalledWith(roleId);
    });

    it('should throw NotFoundException when updating non-existent role', async () => {
      // Arrange: Update attempt on non-existent role
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const updateDto: UpdateRoleDto = { name: 'Updated Name' };

      const existingRole = { _id: roleId, name: 'Existing Role' };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null) // Role not found during update
      });

      // Act & Assert: NotFoundException thrown
      await expect(service.update(roleId, updateDto, globalUser))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('Role Deletion and Transaction Management', () => {
    it('should successfully delete role and update users in transaction', async () => {
      // Arrange: Role deletion with user cleanup
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();
      const roleObjectId = new Types.ObjectId(roleId);

      const existingRole = {
        _id: roleObjectId,
        name: 'Role to Delete',
        isActive: true,
        isDeleted: false
      };

      const deletedRole = {
        ...existingRole,
        isActive: false,
        isDeleted: true
      };

      // Mock findOne for security check
      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      // Mock user update
      userModel.updateMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 2 })
      });

      // Mock role soft delete
      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedRole)
      });

      // Act: Delete role
      const result = await service.remove(roleId, globalUser);

      // Assert: Transaction executed successfully
      expect(connection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();

      // Verify user cleanup
      expect(userModel.updateMany).toHaveBeenCalledWith(
        { roleId: roleObjectId },
        { $set: { roleId: null } },
        { session: mockSession }
      );

      // Verify role soft deletion
      expect(roleModel.findByIdAndUpdate).toHaveBeenCalledWith(
        roleId,
        { isDeleted: true, isActive: false },
        { session: mockSession, new: true }
      );

      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should rollback transaction on deletion failure', async () => {
      // Arrange: Role deletion failure scenario
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();

      const existingRole = {
        _id: roleId,
        name: 'Role Deletion Failure'
      };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      userModel.updateMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 })
      });

      const deletionError = new Error('Database deletion failed');
      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockRejectedValue(deletionError)
      });

      // Act & Assert: Transaction rolled back on failure
      await expect(service.remove(roleId, globalUser))
        .rejects.toThrow(deletionError);

      // Verify transaction cleanup
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(mockSession.commitTransaction).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when deleting non-existent role', async () => {
      // Arrange: Delete non-existent role
      const globalUser = createMockUser(VisibilityScope.GLOBAL);
      const roleId = new Types.ObjectId().toHexString();

      const existingRole = { _id: roleId, name: 'Existing Role' };

      roleModel.findOne = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingRole)
      });

      userModel.updateMany = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 0 })
      });

      roleModel.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null) // Role not found
      });

      // Act & Assert: NotFoundException thrown with transaction cleanup
      await expect(service.remove(roleId, globalUser))
        .rejects.toThrow(NotFoundException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
    });
  });

  describe('Role Validation for Relationships', () => {
    it('should validate existing active role correctly', async () => {
      // Arrange: Valid active role check
      const roleId = new Types.ObjectId().toHexString();

      roleModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(1)
      });

      // Act: Check if role exists and is active
      const result = await service.isRoleExistingAndActive(roleId);

      // Assert: Role validation passes
      expect(result).toBe(true);
      expect(roleModel.countDocuments).toHaveBeenCalledWith({
        _id: roleId,
        isDeleted: false,
        isActive: true
      });
    });

    it('should reject inactive role for relationships', async () => {
      // Arrange: Inactive role check
      const roleId = new Types.ObjectId().toHexString();

      roleModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0) // No active role found
      });

      // Act: Check inactive role
      const result = await service.isRoleExistingAndActive(roleId);

      // Assert: Role validation fails
      expect(result).toBe(false);
    });

    it('should reject deleted role for relationships', async () => {
      // Arrange: Deleted role check
      const roleId = new Types.ObjectId().toHexString();

      roleModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0) // Deleted role not counted
      });

      // Act: Check deleted role
      const result = await service.isRoleExistingAndActive(roleId);

      // Assert: Deleted role rejected
      expect(result).toBe(false);
      expect(roleModel.countDocuments).toHaveBeenCalledWith({
        _id: roleId,
        isDeleted: false,
        isActive: true
      });
    });

    it('should reject non-existent role for relationships', async () => {
      // Arrange: Non-existent role check
      const roleId = new Types.ObjectId().toHexString();

      roleModel.countDocuments = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(0)
      });

      // Act: Check non-existent role
      const result = await service.isRoleExistingAndActive(roleId);

      // Assert: Non-existent role rejected
      expect(result).toBe(false);
    });
  });
});
