import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { NotFoundException } from '@nestjs/common';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

import { UserType } from './schemas/user.schema';
import { VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// Mock request object with user context following RootStock patterns
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
      permissions: [PERMISSIONS.USER_VIEW, PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE],
      isActive: true,
      isDeleted: false,
    }
  }
});

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  describe('User Creation Endpoint', () => {
    it('should create agricultural employee user successfully', async () => {
      // Arrange: Create agricultural employee for orchard management
      const mockRequest = createMockRequest();
      const createDto: CreateUserDto = {
        firstName: 'María',
        lastName: 'Rodriguez',
        email: 'maria.rodriguez@valleyorchards.com',
        userType: UserType.EMPLOYEE,
        roleId: new Types.ObjectId().toHexString(),
        clientIds: [new Types.ObjectId().toHexString()],
      };

      const expectedUser = {
        _id: new Types.ObjectId(),
        recordId: 'USR0001',
        ...createDto,
        name: 'María Rodriguez',
        roleId: new Types.ObjectId(createDto.roleId),
        clientIds: createDto.clientIds ? [new Types.ObjectId(createDto.clientIds[0])] : [],
        isActive: true,
        isDeleted: false
      };

      usersService.create.mockResolvedValue(expectedUser as any);

      // Act: Create user via HTTP endpoint
      const result = await controller.create(createDto, mockRequest);

      // Assert: Verify service integration and response
      expect(usersService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
      expect(result).toEqual(expectedUser);
    });

    it('should create international user with unicode name successfully', async () => {
      // Arrange: International agricultural specialist user
      const mockRequest = createMockRequest();
      const createDto: CreateUserDto = {
        firstName: 'Yamada-san',
        lastName: 'りんご農園マネージャー', // Apple Orchard Manager in Japanese
        email: 'yamada-san@agrisolutions.com',
        userType: UserType.EMPLOYEE,
        roleId: new Types.ObjectId().toHexString(),
        clientIds: [new Types.ObjectId().toHexString()],
      };

      const expectedUser = {
        _id: new Types.ObjectId(),
        recordId: 'USR0005',
        ...createDto,
        name: 'Yamada-san りんご農園マネージャー',
        roleId: new Types.ObjectId(createDto.roleId),
        clientIds: createDto.clientIds ? [new Types.ObjectId(createDto.clientIds[0])] : [],
        isActive: true,
        isDeleted: false
      };

      usersService.create.mockResolvedValue(expectedUser as any);

      // Act: Create international user
      const result = await controller.create(createDto, mockRequest);

      // Assert: Verify unicode preservation and proper encoding
      expect(result.name).toBe('Yamada-san りんご農園マネージャー');
      expect(result.recordId).toBe('USR0005');
    });
  });

  describe('User Query Endpoints', () => {
    it('should return all users for administrator query', async () => {
      // Arrange: Administrator querying all users in agricultural system
      const mockRequest = createMockRequest();
      const queryDto: QueryUserDto = {};
      
      const mockUsers = [
        {
          _id: new Types.ObjectId(),
          recordId: 'USR0001',
          name: 'María Rodriguez',
          email: 'maria@valleyvista.com',
          userType: UserType.EMPLOYEE,
          isActive: true
        },
        {
          _id: new Types.ObjectId(),
          recordId: 'USR0002',
          name: 'John Grower',
          email: 'john@orchard-owner.com',
          userType: UserType.CONTACT,
          isActive: true
        }
      ];

      usersService.findAll.mockResolvedValue(mockUsers as any);

      // Act: Query all users
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: Verify service called with user context
      expect(usersService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no users match client scope', async () => {
      // Arrange: Client-scoped user with no user access in their scope
      const clientUser = {
        _id: new Types.ObjectId(),
        roleId: {
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_VIEW]
        }
      };
      const mockRequest = createMockRequest(clientUser.roleId);
      const queryDto: QueryUserDto = {};

      usersService.findAll.mockResolvedValue([]);

      // Act: Query users as limited-scope user
      const result = await controller.findAll(queryDto, mockRequest);

      // Assert: No users returned due to security filtering
      expect(result).toEqual([]);
      expect(usersService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
    });
  });

  describe('Individual User Access Endpoint', () => {
    it('should return specific user by ID for administrator', async () => {
      // Arrange: Administrator accessing specific agricultural user
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      
      const mockUser = {
        _id: userId,
        recordId: 'USR0005',
        name: 'Premium Orchard Manager',
        firstName: 'Premium',
        lastName: 'Manager',
        userType: UserType.EMPLOYEE,
        clientIds: [new Types.ObjectId()],
        isActive: true,
        isDeleted: false
      };

      usersService.findOne.mockResolvedValue(mockUser as any);

      // Act: Get specific user
      const result = await controller.findOne(userId, mockRequest);

      // Assert: Verify user access with user context
      expect(usersService.findOne).toHaveBeenCalledWith(userId, mockRequest.user);
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user not accessible', async () => {
      // Arrange: User not found or not accessible to requesting user
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      usersService.findOne.mockRejectedValue(new NotFoundException('User not found or access denied'));

      // Act & Assert: Access denied properly handled
      await expect(controller.findOne(userId, mockRequest))
        .rejects.toThrow(NotFoundException);
      
      expect(usersService.findOne).toHaveBeenCalledWith(userId, mockRequest.user);
    });
  });

  describe('User Update Endpoint', () => {
    it('should successfully update user profile information', async () => {
      // Arrange: User profile information update
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'Name',
      };

      const updatedUser = {
        _id: userId,
        recordId: 'USR0001',
        ...updateDto,
        name: 'Updated Name',
        userType: UserType.EMPLOYEE,
        isActive: true,
        isDeleted: false
      };

      usersService.update.mockResolvedValue(updatedUser as any);

      // Act: Update user profile
      const result = await controller.update(userId, updateDto, mockRequest);

      // Assert: Verify service called with proper parameters
      expect(usersService.update).toHaveBeenCalledWith(userId, updateDto, mockRequest.user);
      expect(result).toEqual(updatedUser);
    });

    it('should handle mixed property updates correctly', async () => {
      // Arrange: Multiple property update for comprehensive user profile change
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateUserDto = {
        firstName: 'Updated First',
        lastName: 'Updated Last',
        roleId: new Types.ObjectId().toHexString(),
        isActive: true
      };

      const updatedUser = {
        _id: userId,
        recordId: 'USR0005',
        ...updateDto,
        name: 'Updated First Updated Last',
        roleId: new Types.ObjectId(updateDto.roleId),
        userType: UserType.EMPLOYEE,
        isActive: true
      };

      usersService.update.mockResolvedValue(updatedUser as any);

      // Act: Update multiple properties
      const result = await controller.update(userId, updateDto, mockRequest);

      // Assert: Verify comprehensive update
      expect(result.name).toBe('Updated First Updated Last');
      expect(usersService.update).toHaveBeenCalledWith(userId, updateDto, mockRequest.user);
    });
  });

  describe('User Deletion Endpoint', () => {
    it('should successfully soft delete user', async () => {
      // Arrange: User deletion request for agricultural system cleanup
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletedUser = {
        _id: userId,
        recordId: 'USR0010',
        name: 'User to Delete',
        userType: UserType.EMPLOYEE,
        isActive: false,
        isDeleted: true
      };

      usersService.remove.mockResolvedValue(deletedUser as any);

      // Act: Delete user
      const result = await controller.remove(userId, mockRequest);

      // Assert: Verify service call and soft deletion
      expect(usersService.remove).toHaveBeenCalledWith(userId, mockRequest.user);
      expect(result).toEqual(deletedUser);
      expect(result.isDeleted).toBe(true);
      expect(result.isActive).toBe(false);
    });
  });

  describe('Controller Error Handling', () => {
    it('should propagate service exceptions for user creation failures', async () => {
      // Arrange: Service throws error during user creation
      const mockRequest = createMockRequest();
      const createDto: CreateUserDto = {
        firstName: 'Invalid',
        lastName: 'User',
        email: 'invalid.user@agrisolutions.com',
        userType: UserType.EMPLOYEE,
      };

      const serviceError = new Error('User creation failed due to validation error');
      usersService.create.mockRejectedValue(serviceError);

      // Act & Assert: Service error propagated
      await expect(controller.create(createDto, mockRequest))
        .rejects.toThrow(serviceError);
      
      expect(usersService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
    });

    it('should propagate NotFoundException for invalid user access', async () => {
      // Arrange: Service throws NotFoundException for agricultural user access
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      usersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      // Act & Assert: NotFoundException properly propagated
      await expect(controller.findOne(userId, mockRequest))
        .rejects.toThrow(NotFoundException);
    });

    it('should handle service errors during user updates', async () => {
      // Arrange: Update service throws permission error
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();
      const updateDto: UpdateUserDto = { 
        firstName: 'Updated',
        isActive: false 
      };

      const updateError = new Error('Cannot change status - insufficient permissions');
      usersService.update.mockRejectedValue(updateError);

      // Act & Assert: Update error propagated
      await expect(controller.update(userId, updateDto, mockRequest))
        .rejects.toThrow(updateError);
      
      expect(usersService.update).toHaveBeenCalledWith(userId, updateDto, mockRequest.user);
    });

    it('should handle service errors during user deletion', async () => {
      // Arrange: Deletion service throws error for agricultural user
      const userId = new Types.ObjectId().toHexString();
      const mockRequest = createMockRequest();

      const deletionError = new Error('Cannot delete user - active agricultural assignments exist');
      usersService.remove.mockRejectedValue(deletionError);

      // Act & Assert: Deletion error propagated
      await expect(controller.remove(userId, mockRequest))
        .rejects.toThrow(deletionError);
      
      expect(usersService.remove).toHaveBeenCalledWith(userId, mockRequest.user);
    });
  });

  describe('Visibility Scope Controller Integration', () => {
    describe('Multi-Tenant User Creation Security', () => {
      it('should handle Global user creating users with any client assignments', async () => {
        // Arrange - Global user can create users anywhere
        const globalRole = {
          _id: new Types.ObjectId(),
          name: 'Global Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.USER_CREATE]
        };
        const mockRequest = createMockRequest(globalRole);
        const createDto: CreateUserDto = {
          firstName: 'Global',
          lastName: 'User',
          email: 'global@test.com',
          userType: UserType.EMPLOYEE,
          clientIds: [new Types.ObjectId().toHexString(), new Types.ObjectId().toHexString()]
        };

        const createdUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR0100',
          ...createDto,
          name: 'Global User',
          isActive: true
        };

        usersService.create.mockResolvedValue(createdUser as any);

        // Act
        const result = await controller.create(createDto, mockRequest);

        // Assert - Controller passes request through, service handles validation
        expect(usersService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
        expect(result).toEqual(createdUser);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
      });

      it('should handle Client-scoped user creation requests', async () => {
        // Arrange - Client-scoped user creating user within their scope
        const clientRole = {
          _id: new Types.ObjectId(),
          name: 'Client Manager',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_CREATE]
        };
        const mockRequest = createMockRequest(clientRole);
        const createDto: CreateUserDto = {
          firstName: 'Client',
          lastName: 'User',
          email: 'client@test.com',
          userType: UserType.CONTACT,
          clientIds: [mockRequest.user.clientIds[0].toString()]
        };

        const createdUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR0101',
          ...createDto,
          name: 'Client User',
          isActive: true
        };

        usersService.create.mockResolvedValue(createdUser as any);

        // Act
        const result = await controller.create(createDto, mockRequest);

        // Assert - Service receives proper user context for validation
        expect(usersService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
        expect(result).toEqual(createdUser);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.CLIENT);
      });

      it('should handle unassigned user creation restrictions through service', async () => {
        // Arrange - Non-Global user trying to create unassigned user
        const clientRole = {
          _id: new Types.ObjectId(),
          name: 'Client Manager',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_CREATE]
        };
        const mockRequest = createMockRequest(clientRole);
        const createDto: CreateUserDto = {
          firstName: 'Unassigned',
          lastName: 'User',
          email: 'unassigned@test.com',
          userType: UserType.CONTACT
          // No clientIds - should be restricted for non-Global users
        };

        const forbiddenError = new Error('You do not have permission to create unassigned users');
        usersService.create.mockRejectedValue(forbiddenError);

        // Act & Assert - Service enforces unassigned user restrictions
        await expect(controller.create(createDto, mockRequest))
          .rejects.toThrow(forbiddenError);

        expect(usersService.create).toHaveBeenCalledWith(createDto, mockRequest.user);
      });
    });

    describe('Multi-Tenant User Update Security', () => {
      it('should handle Global user updating any user', async () => {
        // Arrange - Global user can update any user
        const globalRole = {
          _id: new Types.ObjectId(),
          name: 'Global Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const mockRequest = createMockRequest(globalRole);
        const userId = new Types.ObjectId().toHexString();
        const updateDto: UpdateUserDto = {
          firstName: 'Updated by Global'
        };

        const updatedUser = {
          _id: userId,
          recordId: 'USR0200',
          name: 'Updated by Global User',
          firstName: 'Updated by Global',
          isActive: true
        };

        usersService.update.mockResolvedValue(updatedUser as any);

        // Act
        const result = await controller.update(userId, updateDto, mockRequest);

        // Assert
        expect(usersService.update).toHaveBeenCalledWith(userId, updateDto, mockRequest.user);
        expect(result).toEqual(updatedUser);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
      });

      it('should handle Contact user self-modification attempts', async () => {
        // Arrange - Contact user trying to update their own profile
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR002',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const updateDto: UpdateUserDto = {
          firstName: 'Updated Contact',
          email: 'updated@example.com'
        };

        const updatedUser = {
          ...contactUser,
          ...updateDto,
          name: 'Updated Contact User'
        };

        usersService.update.mockResolvedValue(updatedUser as any);

        // Act
        const result = await controller.update(contactUser._id.toString(), updateDto, mockRequest);

        // Assert - Service receives Contact user context for validation
        expect(usersService.update).toHaveBeenCalledWith(contactUser._id.toString(), updateDto, mockRequest.user);
        expect(result).toEqual(updatedUser);
        expect(mockRequest.user.userType).toBe(UserType.CONTACT);
      });

      it('should pass through Contact user business rule validation to service', async () => {
        // Arrange - Contact user with restricted permissions
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR003',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const restrictedUpdateDto: UpdateUserDto = {
          roleId: new Types.ObjectId().toHexString() // Restricted field for Contact users
        };

        const forbiddenError = new Error('Contact users can only update basic personal information');
        usersService.update.mockRejectedValue(forbiddenError);

        // Act & Assert - Service enforces Contact user restrictions
        await expect(controller.update(contactUser._id.toString(), restrictedUpdateDto, mockRequest))
          .rejects.toThrow(forbiddenError);

        expect(usersService.update).toHaveBeenCalledWith(contactUser._id.toString(), restrictedUpdateDto, mockRequest.user);
      });

      it('should handle Contact user attempting to update multiple unauthorized fields', async () => {
        // Arrange - Contact user trying to update multiple restricted fields
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR004',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const multipleRestrictedFieldsDto: UpdateUserDto = {
          firstName: 'Updated', // This is allowed
          roleId: new Types.ObjectId().toHexString(), // UNAUTHORIZED
          clientIds: [new Types.ObjectId().toHexString()], // UNAUTHORIZED
          isActive: false // UNAUTHORIZED
        };

        const multipleFieldsError = new Error('Contact users can only update basic personal information. Unauthorized fields: roleId, clientIds, isActive');
        usersService.update.mockRejectedValue(multipleFieldsError);

        // Act & Assert - Service catches multiple unauthorized field attempts
        await expect(controller.update(contactUser._id.toString(), multipleRestrictedFieldsDto, mockRequest))
          .rejects.toThrow(multipleFieldsError);

        expect(usersService.update).toHaveBeenCalledWith(contactUser._id.toString(), multipleRestrictedFieldsDto, mockRequest.user);
      });

      it('should handle Contact user attempting to update userType field', async () => {
        // Arrange - Contact user trying to change their userType
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR005',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const userTypeUpdateDto: UpdateUserDto = {
          userType: UserType.EMPLOYEE // UNAUTHORIZED field
        };

        const userTypeError = new Error('Contact users can only update basic personal information. Unauthorized fields: userType');
        usersService.update.mockRejectedValue(userTypeError);

        // Act & Assert - Service prevents userType changes by Contact users
        await expect(controller.update(contactUser._id.toString(), userTypeUpdateDto, mockRequest))
          .rejects.toThrow(userTypeError);

        expect(usersService.update).toHaveBeenCalledWith(contactUser._id.toString(), userTypeUpdateDto, mockRequest.user);
      });

      it('should handle Contact user attempting to update another user', async () => {
        // Arrange - Contact user trying to update different user (even with allowed fields)
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR006',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const otherUserId = new Types.ObjectId().toHexString();
        const basicUpdateDto: UpdateUserDto = {
          firstName: 'Updated Name', // Normally allowed field
          email: 'updated@example.com' // Normally allowed field
        };

        const otherUserError = new Error('Contact users can only update their own account information');
        usersService.update.mockRejectedValue(otherUserError);

        // Act & Assert - Service prevents Contact users from updating other users
        await expect(controller.update(otherUserId, basicUpdateDto, mockRequest))
          .rejects.toThrow(otherUserError);

        expect(usersService.update).toHaveBeenCalledWith(otherUserId, basicUpdateDto, mockRequest.user);
      });

      it('should handle Contact user successful basic field updates', async () => {
        // Arrange - Contact user successfully updating their own basic information
        const contactRole = {
          _id: new Types.ObjectId(),
          name: 'Contact Role',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_EDIT]
        };
        const contactUser = {
          _id: new Types.ObjectId(),
          recordId: 'USR007',
          firstName: 'Contact',
          lastName: 'User',
          name: 'Contact User',
          email: 'contact@example.com',
          userType: UserType.CONTACT,
          clientIds: [new Types.ObjectId()],
          isActive: true,
          isDeleted: false,
          roleId: contactRole
        };
        const mockRequest = { user: contactUser };
        
        const allowedUpdateDto: UpdateUserDto = {
          firstName: 'Updated Contact',
          lastName: 'Updated User',
          email: 'updated.contact@example.com'
        };

        const successfulUpdate = {
          ...contactUser,
          ...allowedUpdateDto,
          name: 'Updated Contact Updated User'
        };

        usersService.update.mockResolvedValue(successfulUpdate as any);

        // Act
        const result = await controller.update(contactUser._id.toString(), allowedUpdateDto, mockRequest);

        // Assert - Controller delegates to service successfully
        expect(usersService.update).toHaveBeenCalledWith(contactUser._id.toString(), allowedUpdateDto, mockRequest.user);
        expect(result).toEqual(successfulUpdate);
        expect(result.firstName).toBe('Updated Contact');
        expect(result.email).toBe('updated.contact@example.com');
      });
    });

    describe('Multi-Tenant User Deletion Security', () => {
      it('should handle Global user deleting any user', async () => {
        // Arrange - Global user can delete any user
        const globalRole = {
          _id: new Types.ObjectId(),
          name: 'Global Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.USER_DELETE]
        };
        const mockRequest = createMockRequest(globalRole);
        const userId = new Types.ObjectId().toHexString();

        const deletedUser = {
          _id: userId,
          recordId: 'USR0300',
          name: 'Deleted User',
          isActive: false,
          isDeleted: true
        };

        usersService.remove.mockResolvedValue(deletedUser as any);

        // Act
        const result = await controller.remove(userId, mockRequest);

        // Assert
        expect(usersService.remove).toHaveBeenCalledWith(userId, mockRequest.user);
        expect(result).toEqual(deletedUser);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
      });

      it('should handle Client-scoped user deletion attempts', async () => {
        // Arrange - Client-scoped user trying to delete user in their scope
        const clientRole = {
          _id: new Types.ObjectId(),
          name: 'Client Manager',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_DELETE]
        };
        const mockRequest = createMockRequest(clientRole);
        const userId = new Types.ObjectId().toHexString();

        const deletedUser = {
          _id: userId,
          recordId: 'USR0301',
          name: 'Client Deleted User',
          isActive: false,
          isDeleted: true
        };

        usersService.remove.mockResolvedValue(deletedUser as any);

        // Act
        const result = await controller.remove(userId, mockRequest);

        // Assert - Service handles scope validation
        expect(usersService.remove).toHaveBeenCalledWith(userId, mockRequest.user);
        expect(result).toEqual(deletedUser);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.CLIENT);
      });
    });

    describe('Multi-Tenant Query Security', () => {
      it('should handle Global user querying all users', async () => {
        // Arrange - Global user can see all users
        const globalRole = {
          _id: new Types.ObjectId(),
          name: 'Global Administrator',
          visibilityScope: VisibilityScope.GLOBAL,
          permissions: [PERMISSIONS.USER_VIEW]
        };
        const mockRequest = createMockRequest(globalRole);
        const queryDto: QueryUserDto = {};

        const allUsers = [
          { recordId: 'USR0001', name: 'Global User 1', userType: UserType.EMPLOYEE },
          { recordId: 'USR0002', name: 'Client User 1', userType: UserType.CONTACT },
          { recordId: 'USR0003', name: 'Subsidiary User 1', userType: UserType.EMPLOYEE }
        ];

        usersService.findAll.mockResolvedValue(allUsers as any);

        // Act
        const result = await controller.findAll(queryDto, mockRequest);

        // Assert - Global user sees all users (service handles filtering)
        expect(usersService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
        expect(result).toEqual(allUsers);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.GLOBAL);
      });

      it('should handle Client-scoped user querying users in scope', async () => {
        // Arrange - Client-scoped user can only see users in their client scope
        const clientRole = {
          _id: new Types.ObjectId(),
          name: 'Client Manager',
          visibilityScope: VisibilityScope.CLIENT,
          permissions: [PERMISSIONS.USER_VIEW]
        };
        const mockRequest = createMockRequest(clientRole);
        const queryDto: QueryUserDto = {};

        const scopedUsers = [
          { recordId: 'USR0010', name: 'Client User 1', userType: UserType.CONTACT },
          { recordId: 'USR0011', name: 'Client User 2', userType: UserType.EMPLOYEE }
        ];

        usersService.findAll.mockResolvedValue(scopedUsers as any);

        // Act
        const result = await controller.findAll(queryDto, mockRequest);

        // Assert - Service filters based on client scope
        expect(usersService.findAll).toHaveBeenCalledWith(queryDto, mockRequest.user);
        expect(result).toEqual(scopedUsers);
        expect(mockRequest.user.roleId.visibilityScope).toBe(VisibilityScope.CLIENT);
      });
    });
  });
});
