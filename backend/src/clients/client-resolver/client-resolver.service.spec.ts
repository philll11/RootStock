import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClientResolverService } from './client-resolver.service';
import { Client, ClientDocument } from '../schemas/client.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';

const toObjectId = (id: string) => new Types.ObjectId(id);

describe('ClientResolverService', () => {
  let service: ClientResolverService;
  let clientModel: Model<ClientDocument>;

  // --- Mock Data ---
  const mockUser: Partial<User> = {
    clientIds: [toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4c2')]
  };

  const mockAssignedClients = [
    { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
    { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a2') },
  ];

  const mockAccessibleClients = [
    { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1') },
    { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2') },
    { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c3') },
  ];

  // --- Mock Model ---
  const mockClientModel = {
    find: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientResolverService,
        {
          provide: getModelToken(Client.name),
          useValue: mockClientModel,
        },
      ],
    }).compile();

    service = module.get<ClientResolverService>(ClientResolverService);
    clientModel = module.get<Model<ClientDocument>>(getModelToken(Client.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAccessibleClientIdsForSubsidiaryScope', () => {

    // --- Happy Path Tests ---
    it('should correctly resolve and return all client IDs within the user\'s subsidiaries', async () => {
      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(mockAssignedClients),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(mockAccessibleClients),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(mockUser as User);

      expect(clientModel.find).toHaveBeenCalledWith({ _id: { $in: mockUser.clientIds } });
      expect(clientModel.find).toHaveBeenCalledWith({ subsidiaryId: { $in: [toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4a2')] } });
      expect(result).toEqual(mockAccessibleClients.map(c => c._id));
      expect(result.length).toBe(3);
    });

    // --- Unhappy Path & Edge Case Tests ---
    it('should return an empty array if user.clientIds is empty', async () => {
      const userWithoutClients: Partial<User> = { clientIds: [] };
      const result = await service.getAccessibleClientIdsForSubsidiaryScope(userWithoutClients as User);
      expect(result).toEqual([]);
      expect(clientModel.find).not.toHaveBeenCalled();
    });

    it('should return an empty array if user.clientIds is null or undefined', async () => {
      const userWithNullClients: Partial<User> = { clientIds: null as any };
      const result = await service.getAccessibleClientIdsForSubsidiaryScope(userWithNullClients as User);
      expect(result).toEqual([]);
      expect(clientModel.find).not.toHaveBeenCalled();
    });
    
    it('should gracefully handle cases where assigned clients are not found in the database', async () => {
      // Simulate the case where a user is assigned to a client that has since been hard-deleted
      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce([]), // The DB returns nothing
      });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(mockUser as User);
      
      expect(result).toEqual([]);
      // Crucially, it should only call `find` once and then stop.
      expect(clientModel.find).toHaveBeenCalledTimes(1);
      expect(clientModel.find).toHaveBeenCalledWith({ _id: { $in: mockUser.clientIds } });
    });

    it('should propagate errors from the database', async () => {
      const dbError = new Error('Database connection failed');
      // Force the mock `exec` function to reject the promise, simulating a DB error
      (clientModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(dbError),
      });

      // We expect our service call to be rejected with the same error
      await expect(service.getAccessibleClientIdsForSubsidiaryScope(mockUser as User)).rejects.toThrow('Database connection failed');
    });
  });
});