import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User, UserDocument, UserType } from './schemas/user.schema';
import { Role, VisibilityScope } from '../roles/schemas/role.schema';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

// --- Mock Data and Helpers ---
const mockUserId = new Types.ObjectId().toHexString();
const mockUser = (permissions: string[] = [], type: UserType = UserType.EMPLOYEE): User => ({
  _id: new Types.ObjectId().toHexString(),
  recordId: 'USER_MOCK',
  name: 'Mock User',
  firstName: 'Mock',
  lastName: 'User',
  userType: type,
  clientIds: [],
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

const mockUserDocument = {
  _id: mockUserId,
  recordId: 'USER_DOC_MOCK',
  name: 'Mock User Document',
  firstName: 'Mock',
  lastName: 'Doc',
  userType: UserType.EMPLOYEE,
  isActive: true,
  isDeleted: false,
};

describe('UsersService', () => {
  let service: UsersService;
  let userModel: Model<UserDocument>;
  let clientModel: Model<ClientDocument>;

  // --- Mocks for Dependencies ---
  const mockUserModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockClientModel = {
    // Client model is used by UserQueryBuilder, which we will mock,
    // so we only need a placeholder for it in the provider setup.
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Client.name), useValue: mockClientModel },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    clientModel = module.get<Model<ClientDocument>>(getModelToken(Client.name));

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should correctly prepare and create a user', async () => {
      const createDto = { firstName: 'Test', lastName: 'User', userType: UserType.EMPLOYEE, recordId: 'T1' };
      (userModel.create as jest.Mock).mockResolvedValue({ ...createDto, name: 'Test User' });
      
      const result = await service.create(createDto as any);
      
      expect(userModel.create).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Test User',
      }));
      expect(result.name).toBe('Test User');
    });
  });

  describe('update', () => {
    it('should successfully update a user', async () => {
      const updateDto = { firstName: 'Updated' };
      const userWithPermissions = mockUser([PERMISSIONS.USER_EDIT]);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUserDocument as any);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockUserDocument, firstName: 'Updated', name: 'Updated Doc' }),
      });

      const result = await service.update(mockUserId, updateDto, userWithPermissions);
      expect(service.findOne).toHaveBeenCalledWith(mockUserId, userWithPermissions);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Doc');
    });

    it('should throw ForbiddenException when updating a contact user\'s clientIds', async () => {
      const updateDto = { clientIds: ['new_client_id'] };
      const contactUser = mockUser([], UserType.CONTACT);
      jest.spyOn(service, 'findOne').mockResolvedValue(contactUser as any);

      await expect(service.update(mockUserId, updateDto, mockUser())).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user tries to change isActive without permission', async () => {
      const updateDto = { isActive: false };
      const userWithoutPermission = mockUser([PERMISSIONS.USER_EDIT]); // Missing USER_EDIT_STATUS
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUserDocument as any);
      
      await expect(service.update(mockUserId, updateDto, userWithoutPermission)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should find and return a user', async () => {
      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUserDocument),
      });
      const result = await service.findOne(mockUserId, mockUser());
      expect(userModel.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockUserDocument);
    });

    it('should throw NotFoundException if user is not found', async () => {
      (userModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne(mockUserId, mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a user', async () => {
      const userWithPermission = mockUser([PERMISSIONS.USER_DELETE]);
      const deletedUser = { ...mockUserDocument, isDeleted: true, isActive: false };
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUserDocument as any);
      (userModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
          exec: jest.fn().mockResolvedValue(deletedUser)
      });
      
      const result = await service.remove(mockUserId, userWithPermission);

      expect(service.findOne).toHaveBeenCalledWith(mockUserId, userWithPermission);
      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
          mockUserId,
          { isDeleted: true, isActive: false },
          { new: true },
      );
      expect(result.isDeleted).toBe(true);
    });
  });

  describe('validateContactUserIds (New Method)', () => {
    it('should return true for a valid list of contact user IDs', async () => {
        const ids = ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4'];
        (userModel.countDocuments as jest.Mock).mockResolvedValue(2);
        const result = await service.validateContactUserIds(ids);
        expect(result).toBe(true);
        expect(userModel.countDocuments).toHaveBeenCalledWith({
            _id: { $in: ids.map(id => new Types.ObjectId(id)) },
            userType: UserType.CONTACT,
            isActive: true,
            isDeleted: false,
        });
    });

    it('should return false if the count of valid contact users does not match', async () => {
        const ids = ['60f8f1b3b5f9f1b3b5f9f1b3', '60f8f1b3b5f9f1b3b5f9f1b4', '60f8f1b3b5f9f1b3b5f9f1b5'];
        
        (userModel.countDocuments as jest.Mock).mockResolvedValue(2); // Only 2 are valid
        
        const result = await service.validateContactUserIds(ids);
        expect(result).toBe(false);
    });

    it('should return true for an empty or null array without querying the database', async () => {
        expect(await service.validateContactUserIds([])).toBe(true);
        expect(await service.validateContactUserIds(null as any)).toBe(true);
        expect(userModel.countDocuments).not.toHaveBeenCalled();
    });
  });
});