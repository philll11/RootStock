import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { UsersService } from '../users/users.service';

import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { QueryUserDto } from '../users/dto/query-user.dto';

import { VisibilityScope } from './schemas/role.schema';
import { UserType } from '../users/schemas/user.schema';
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
      permissions: [PERMISSIONS.ROLE_VIEW, PERMISSIONS.ROLE_CREATE, PERMISSIONS.ROLE_EDIT, PERMISSIONS.ROLE_DELETE],
      isActive: true,
      isDeleted: false,
    }
  }
});

describe('RolesController', () => {
  let controller: RolesController;
  let rolesService: jest.Mocked<RolesService>;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockRolesService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const mockUsersService = {
      findAllByRoleId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        { provide: RolesService, useValue: mockRolesService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
    rolesService = module.get(RolesService);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Role Creation Endpoint', () => {
    it('should create system administrator role successfully', async () => {
      // Arrange: Admin role creation request
      const createDto: CreateRoleDto = {
        name: 'System Administrator',
        description: 'Full platform access for system administration',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [
          PERMISSIONS.USER_CREATE,
          PERMISSIONS.USER_EDIT,
          PERMISSIONS.CLIENT_CREATE,
          PERMISSIONS.ROLE_CREATE
        ]
      };

      const expectedRole = {
        _id: new Types.ObjectId(),
        recordId: 'ROL0001',
        ...createDto,
        isActive: true,
        isDeleted: false
      };

      rolesService.create.mockResolvedValue(expectedRole as any);

      // Act: Create role via HTTP endpoint
      const result = await controller.create(createDto);

      // Assert: Verify service integration and response
      expect(rolesService.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(expectedRole);
      expect(result.recordId).toBe('ROL0001');
      expect(result.visibilityScope).toBe(VisibilityScope.GLOBAL);
    });

    it('should create regional consultant role successfully', async () => {
      // Arrange: Consultant role for subsidiary management
      const createDto: CreateRoleDto = {
        name: 'Regional Agricultural Consultant',
        description: 'Manages multiple clients within a subsidiary region',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.CLIENT_EDIT,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT,
          PERMISSIONS.USER_VIEW
        ]
      };

      const expectedRole = {
        _id: new Types.ObjectId(),
        recordId: 'ROL0005',
        ...createDto,
        isActive: true,
        isDeleted: false
      };

      rolesService.create.mockResolvedValue(expectedRole as any);

      // Act: Create consultant role
      const result = await controller.create(createDto);

      // Assert: Verify consultant role structure
      expect(result.visibilityScope).toBe(VisibilityScope.SUBSIDIARY);
      expect(result.permissions).toContain(PERMISSIONS.CLIENT_EDIT);
      expect(result.permissions).toContain(PERMISSIONS.ORCHARD_VIEW);
      expect(result.recordId).toBe('ROL0005');
    });

    it('should create client-scoped grower role successfully', async () => {
      // Arrange: Grower role for individual orchard management
      const createDto: CreateRoleDto = {
        name: 'Orchard Grower',
        description: 'Individual orchard owner with limited access to own orchards',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.ORCHARD_EDIT
        ]
      };

      const expectedRole = {
        _id: new Types.ObjectId(),
        recordId: 'ROL0010',
        ...createDto,
        isActive: true,
        isDeleted: false
      };

      rolesService.create.mockResolvedValue(expectedRole as any);

      // Act: Create grower role
      const result = await controller.create(createDto);

      // Assert: Verify grower role limitations
      expect(result.visibilityScope).toBe(VisibilityScope.CLIENT);
      expect(result.permissions).toHaveLength(2);
      expect(result.permissions).not.toContain(PERMISSIONS.USER_CREATE);
    });
  });

  describe('Role Query Endpoints', () => {
    it('should return all roles for administrator query', async () => {
      // Arrange: Administrator querying all roles
      const mockRequest = createMockRequest();
      const queryDto: QueryRoleDto = {};
      
      const mockRoles = [
        {
          _id: new Types.ObjectId(),
          recordId: 'ROL0001',
          name: 'System Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.ROLE_CREATE, PERMISSIONS.USER_CREATE],
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'ROL0002',
          name: 'Regional Consultant',
          visibilityScope: VisibilityScope.SUBSIDIARY,
          permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW],
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'ROL0003',
          name: 'Orchard Grower',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.ORCHARD_VIEW],
          isActive: true
        }
      ];

      rolesService.findAll.mockResolvedValue(mockRoles as any);

      // Act: Query all roles
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify service called with user context
      expect(rolesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(mockRoles);
      expect(result).toHaveLength(3);
    });

    it('should apply query filters for role search', async () => {
      // Arrange: Filtered role query
      const mockRequest = createMockRequest();
      const queryDto: QueryRoleDto = {
        name: 'Administrator',
        isActive: true
      };

      const filteredRoles = [
        {
          _id: new Types.ObjectId(),
          recordId: 'ROL0001',
          name: 'System Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          isActive: true
        }
      ];

      rolesService.findAll.mockResolvedValue(filteredRoles as any);

      // Act: Query with filters
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify filtered query passed to service
      expect(rolesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(filteredRoles);
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no roles match user scope', async () => {
      // Arrange: Non-admin user with no role access
      const clientUser = {
        _id: new Types.ObjectId(),
        roleId: {
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.CLIENT_VIEW]
        }
      };
      const mockRequest = createMockRequest(clientUser.roleId);
      const queryDto: QueryRoleDto = {};

      rolesService.findAll.mockResolvedValue([]);

      // Act: Query roles as non-admin
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: No roles returned due to security filtering
      expect(result).toEqual([]);
      expect(rolesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
    });
  });

  describe('Individual Role Access Endpoint', () => {
    it('should return specific role by ID for administrator', async () => {
      // Arrange: Administrator accessing specific role
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      
      const mockRole = {
        _id: roleId,
        recordId: 'ROL0005',
        name: 'Regional Consultant',
        description: 'Subsidiary-level consultant role',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [PERMISSIONS.CLIENT_VIEW, PERMISSIONS.ORCHARD_VIEW],
        isActive: true,
        isDeleted: false
      };

      rolesService.findOne.mockResolvedValue(mockRole as any);

      // Act: Get specific role
      const result = await controller.findOne(roleId, mockRequest);

      // Assert: Verify role access with user context
      expect(rolesService.findOne).toHaveBeenCalledWith(roleId, mockRequest.user);
      expect(result).toEqual(mockRole);
      expect(result.recordId).toBe('ROL0005');
    });

    it('should throw NotFoundException when role not accessible', async () => {
      // Arrange: Role not found or not accessible to user
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      rolesService.findOne.mockRejectedValue(new NotFoundException('Role not found or access denied'));

      // Act & Assert: Access denied properly handled
      await expect(controller.findOne(roleId, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      expect(rolesService.findOne).toHaveBeenCalledWith(roleId, mockRequest.user);
    });
  });

  describe('Role User Association Endpoint', () => {
    it('should return users assigned to specific role', async () => {
      // Arrange: Querying users for a specific role
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {};

      const mockRole = {
        _id: roleId,
        recordId: 'ROL0001',
        name: 'System Administrator'
      };

      const mockUsers = [
        {
          _id: new Types.ObjectId(),
          recordId: 'USR001',
          name: 'John Admin',
          email: 'john@example.com',
          roleId: roleId,
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'USR002',
          name: 'Jane Admin',
          email: 'jane@example.com',
          roleId: roleId,
          isActive: true
        }
      ];

      rolesService.findOne.mockResolvedValue(mockRole as any);
      usersService.findAllByRoleId.mockResolvedValue(mockUsers as any);

      // Act: Get users for role
      const result = await controller.findAllUsersForRole(roleId, queryDto, mockRequest);

      // Assert: Verify security check and user retrieval
      expect(rolesService.findOne).toHaveBeenCalledWith(roleId, mockRequest.user);
      expect(usersService.findAllByRoleId).toHaveBeenCalledWith(roleId, queryDto, mockRequest.user);
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should perform security check before returning role users', async () => {
      // Arrange: Role access check before user listing
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {};

      rolesService.findOne.mockRejectedValue(new NotFoundException('Role not accessible'));

      // Act & Assert: Security check prevents user access
      await expect(controller.findAllUsersForRole(roleId, queryDto, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      // Verify security check happened first
      expect(rolesService.findOne).toHaveBeenCalledWith(roleId, mockRequest.user);
      expect(usersService.findAllByRoleId).not.toHaveBeenCalled();
    });

    it('should apply user query filters when listing role users', async () => {
      // Arrange: Filtered user query for role
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {
        includeInactives: false,
        name: 'Admin'
      };

      const mockRole = { _id: roleId, name: 'Administrator Role' };
      const filteredUsers = [
        {
          _id: new Types.ObjectId(),
          name: 'Admin User',
          roleId: roleId,
          isActive: true
        }
      ];

      rolesService.findOne.mockResolvedValue(mockRole as any);
      usersService.findAllByRoleId.mockResolvedValue(filteredUsers as any);

      // Act: Get filtered users for role
      const result = await controller.findAllUsersForRole(roleId, queryDto, mockRequest);

      // Assert: Verify filtered query passed to users service
      expect(usersService.findAllByRoleId).toHaveBeenCalledWith(roleId, queryDto, mockRequest.user);
      expect(result).toEqual(filteredUsers);
    });
  });

  describe('Role Update Endpoint', () => {
    it('should successfully update role information', async () => {
      // Arrange: Role information update
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateRoleDto = {
        name: 'Updated Administrator Role',
        description: 'Enhanced system administration with new capabilities'
      };

      const updatedRole = {
        _id: roleId,
        recordId: 'ROL0001',
        ...updateDto,
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: [PERMISSIONS.USER_CREATE, PERMISSIONS.ROLE_CREATE],
        isActive: true,
        isDeleted: false
      };

      rolesService.update.mockResolvedValue(updatedRole as any);

      // Act: Update role
      const result = await controller.update(roleId, updateDto, mockRequest);

      // Assert: Verify service called with proper parameters
      expect(rolesService.update).toHaveBeenCalledWith(roleId, updateDto, mockRequest.user);
      expect(result).toEqual(updatedRole);
      expect(result.name).toBe(updateDto.name);
      expect(result.description).toBe(updateDto.description);
    });

    it('should successfully update role permissions', async () => {
      // Arrange: Role permission modification
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateRoleDto = {
        permissions: [
          PERMISSIONS.CLIENT_VIEW,
          PERMISSIONS.CLIENT_EDIT,
          PERMISSIONS.ORCHARD_VIEW,
          PERMISSIONS.USER_VIEW
        ]
      };

      const updatedRole = {
        _id: roleId,
        recordId: 'ROL0002',
        name: 'Regional Consultant',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: updateDto.permissions,
        isActive: true
      };

      rolesService.update.mockResolvedValue(updatedRole as any);

      // Act: Update role permissions
      const result = await controller.update(roleId, updateDto, mockRequest);

      // Assert: Verify permission update
      expect(result.permissions).toEqual(updateDto.permissions);
      expect(result.permissions).toContain(PERMISSIONS.CLIENT_EDIT);
      expect(result.permissions).toContain(PERMISSIONS.USER_VIEW);
    });

    it('should handle role deactivation request', async () => {
      // Arrange: Role deactivation
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateRoleDto = {
        isActive: false
      };

      const deactivatedRole = {
        _id: roleId,
        recordId: 'ROL0003',
        name: 'Deprecated Role',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [PERMISSIONS.ORCHARD_VIEW],
        isActive: false
      };

      rolesService.update.mockResolvedValue(deactivatedRole as any);

      // Act: Deactivate role
      const result = await controller.update(roleId, updateDto, mockRequest);

      // Assert: Verify deactivation
      expect(result.isActive).toBe(false);
      expect(rolesService.update).toHaveBeenCalledWith(roleId, updateDto, mockRequest.user);
    });
  });

  describe('Role Deletion Endpoint', () => {
    it('should successfully delete role', async () => {
      // Arrange: Role deletion request
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletedRole = {
        _id: roleId,
        recordId: 'ROL0004',
        name: 'Obsolete Role',
        visibilityScope: VisibilityScope.CLIENT,
        permissions: [],
        isActive: false,
        isDeleted: true
      };

      rolesService.remove.mockResolvedValue(deletedRole as any);

      // Act: Delete role
      const result = await controller.remove(roleId, mockRequest);

      // Assert: Verify service call and soft deletion
      expect(rolesService.remove).toHaveBeenCalledWith(roleId, mockRequest.user);
      expect(result).toEqual(deletedRole);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });

    it('should handle role deletion with user cleanup', async () => {
      // Arrange: Role with users being deleted
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletedRole = {
        _id: roleId,
        recordId: 'ROL0005',
        name: 'Role With Users',
        visibilityScope: VisibilityScope.SUBSIDIARY,
        permissions: [PERMISSIONS.CLIENT_VIEW],
        isActive: false,
        isDeleted: true
      };

      rolesService.remove.mockResolvedValue(deletedRole as any);

      // Act: Delete role with associated users
      const result = await controller.remove(roleId, mockRequest);

      // Assert: Verify transactional deletion handled by service
      expect(rolesService.remove).toHaveBeenCalledWith(roleId, mockRequest.user);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });
  });

  describe('Controller Error Handling', () => {
    it('should propagate service exceptions for role creation failures', async () => {
      // Arrange: Service throws error during creation
      const createDto: CreateRoleDto = {
        name: 'Invalid Role',
        visibilityScope: VisibilityScope.GLOBAL,
        permissions: []
      };

      const serviceError = new Error('Role creation failed due to validation error');
      rolesService.create.mockRejectedValue(serviceError);

      // Act & Assert: Service error propagated
      await expect(controller.create(createDto))
        .rejects.toThrow(serviceError);
      
      expect(rolesService.create).toHaveBeenCalledWith(createDto);
    });

    it('should propagate NotFoundException for invalid role access', async () => {
      // Arrange: Service throws NotFoundException
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      rolesService.findOne.mockRejectedValue(new NotFoundException('Role not found'));

      // Act & Assert: NotFoundException properly propagated
      await expect(controller.findOne(roleId, mockRequest))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle service errors during role updates', async () => {
      // Arrange: Update service throws error
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateRoleDto = { name: 'Updated Name' };

      const updateError = new Error('Update failed - database constraint violation');
      rolesService.update.mockRejectedValue(updateError);

      // Act & Assert: Update error propagated
      await expect(controller.update(roleId, updateDto, mockRequest))
        .rejects.toThrow(updateError);
      
      expect(rolesService.update).toHaveBeenCalledWith(roleId, updateDto, mockRequest.user);
    });

    it('should handle service errors during role deletion', async () => {
      // Arrange: Deletion service throws error
      const roleId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletionError = new Error('Cannot delete role - active users assigned');
      rolesService.remove.mockRejectedValue(deletionError);

      // Act & Assert: Deletion error propagated
      await expect(controller.remove(roleId, mockRequest))
        .rejects.toThrow(deletionError);
      
      expect(rolesService.remove).toHaveBeenCalledWith(roleId, mockRequest.user);
    });
  });

  describe('HTTP Request/Response Integration', () => {
    it('should properly extract user context from request', async () => {
      // Arrange: Request with user context
      const mockRequest = createMockRequest();
      const queryDto: QueryRoleDto = {};

      rolesService.findAll.mockResolvedValue([]);

      // Act: Call endpoint with user context
      await controller.findAll(queryDto, mockRequest);

      // Assert: User context passed to service
      expect(rolesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
    });

    it('should handle MongoDB ObjectId parameter parsing', async () => {
      // Arrange: Valid ObjectId parameter
      const validObjectId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const mockRole = {
        _id: validObjectId,
        recordId: 'ROL0001',
        name: 'Test Role'
      };

      rolesService.findOne.mockResolvedValue(mockRole as any);

      // Act: Access role with ObjectId parameter
      const result = await controller.findOne(validObjectId, mockRequest);

      // Assert: ObjectId properly parsed and used
      expect(rolesService.findOne).toHaveBeenCalledWith(validObjectId, mockRequest.user);
      expect((result as any)._id).toBe(validObjectId);
    });

    it('should properly handle query parameters for filtering', async () => {
      // Arrange: Request with query parameters
      const mockRequest = createMockRequest();
      const queryDto: QueryRoleDto = {
        name: 'Administrator',
        isActive: true
      };

      const filteredRoles = [
        {
          _id: new Types.ObjectId(),
          name: 'System Administrator',
          isActive: true,
          visibilityScope: VisibilityScope.GLOBAL
        }
      ];

      rolesService.findAll.mockResolvedValue(filteredRoles as any);

      // Act: Query with parameters
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Query parameters properly passed to service
      expect(rolesService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(filteredRoles);
    });
  });
});
