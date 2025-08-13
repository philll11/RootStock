import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { Model, Connection, Types } from 'mongoose';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { Client, ClientDocument } from './schemas/client.schema';
import { User, UserDocument, UserType } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { Role, VisibilityScope } from '../roles/schemas/role.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

const mockClientId = new Types.ObjectId().toHexString();

// Mock User object for testing
const mockUser = (permissions: string[] = []): User => ({
  _id: new Types.ObjectId().toHexString(),
  recordId: 'USER_MOCK',
  name: 'Mock User',
  firstName: 'Mock',
  lastName: 'User',
  userType: UserType.EMPLOYEE,
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

// Mock Client document
const mockClient = {
  _id: mockClientId,
  recordId: 'CLI_MOCK',
  name: 'Mock Client',
  isActive: true,
  isDeleted: false,
};

describe('ClientsService', () => {
  let service: ClientsService;
  let clientModel: Model<ClientDocument>;
  let userModel: Model<UserDocument>;
  let usersService: UsersService;
  let connection: Connection;

  const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  };

  const mockConnection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  const mockClientModel = {
    new: jest.fn().mockResolvedValue(mockClient),
    constructor: jest.fn().mockResolvedValue(mockClient),
    find: jest.fn(),
    findOne: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    save: jest.fn().mockResolvedValue(mockClient),
    exec: jest.fn(),
    countDocuments: jest.fn(),
  };

  const mockUserModel = {
    updateMany: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(true) }),
  };

  const mockUsersService = {
    countActiveByClientId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        { provide: getModelToken(Client.name), useValue: mockClientModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: UsersService, useValue: mockUsersService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
    clientModel = module.get<Model<ClientDocument>>(getModelToken(Client.name));
    userModel = module.get<Model<UserDocument>>(getModelToken(User.name));
    usersService = module.get<UsersService>(UsersService);
    connection = module.get<Connection>(getConnectionToken());

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should successfully update a client', async () => {
      const updateDto = { name: 'Updated Client Name' };
      const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT]);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
      (clientModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue({ ...mockClient, ...updateDto }),
      });
      const result = await service.update(mockClientId, updateDto, userWithPermissions);
      expect(service.findOne).toHaveBeenCalledWith(mockClientId, userWithPermissions);
      expect(clientModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Client Name');
    });

    it('should throw ConflictException when trying to deactivate a client with active users', async () => {
      const updateDto = { isActive: false };
      const userWithPermissions = mockUser([PERMISSIONS.CLIENT_EDIT, PERMISSIONS.CLIENT_EDIT_STATUS]);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
      jest.spyOn(usersService, 'countActiveByClientId').mockResolvedValue(1);
      await expect(service.update(mockClientId, updateDto, userWithPermissions)).rejects.toThrow(ConflictException);
      expect(usersService.countActiveByClientId).toHaveBeenCalledWith(mockClientId);
    });

    it('should throw ForbiddenException if user tries to change isActive without permission', async () => {
      const updateDto = { isActive: false };
      const userWithoutPermission = mockUser([PERMISSIONS.CLIENT_EDIT]);
      jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
      jest.spyOn(usersService, 'countActiveByClientId').mockResolvedValue(0);
      await expect(service.update(mockClientId, updateDto, userWithoutPermission)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should find and return a client', async () => {
      (clientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockClient),
      });
      const result = await service.findOne(mockClientId, mockUser());
      expect(clientModel.findOne).toHaveBeenCalled();
      expect(result).toEqual(mockClient);
    });

    it('should throw NotFoundException if client is not found or not visible', async () => {
      (clientModel.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      await expect(service.findOne(mockClientId, mockUser())).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should soft delete a client and disassociate users within a transaction', async () => {
      const user = mockUser([PERMISSIONS.CLIENT_DELETE]);
      const deletedClient = { ...mockClient, isDeleted: true, isActive: false };

      jest.spyOn(service, 'findOne').mockResolvedValue(mockClient as any);
      (clientModel.findByIdAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(deletedClient),
      });

      const result = await service.remove(mockClientId, user);

      expect(service.findOne).toHaveBeenCalledWith(mockClientId, user);
      expect(connection.startSession).toHaveBeenCalled();
      expect(mockSession.startTransaction).toHaveBeenCalled();
      expect(userModel.updateMany).toHaveBeenCalledWith(
        { clientIds: mockClientId },
        { $pull: { clientIds: mockClientId } },
        { session: mockSession },
      );
      expect(clientModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockClientId,
        { isDeleted: true, isActive: false },
        { session: mockSession, new: true },
      );
      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.endSession).toHaveBeenCalled();
      expect(result).toEqual(deletedClient);
    });
  });
});