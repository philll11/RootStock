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

      expect(clientModel.find).toHaveBeenCalledWith({ 
        _id: { $in: mockUser.clientIds },
        isActive: true,
        isDeleted: false,
      });
      expect(clientModel.find).toHaveBeenCalledWith({ 
        subsidiaryId: { $in: [toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4a2')] },
        isActive: true,
        isDeleted: false,
      });
      expect(result).toEqual(mockAccessibleClients.map(c => c._id));
      expect(result.length).toBe(3);
    });

    it('should include standalone clients (no subsidiary) in the result', async () => {
      const standaloneClientId = toObjectId('65a9a1a7b8e5c6e2f1f4a4c9');
      const userWithStandaloneClient: Partial<User> = {
        clientIds: [standaloneClientId]
      };

      const mockStandaloneClient = { _id: standaloneClientId, subsidiaryId: null };

      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce([mockStandaloneClient]),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(userWithStandaloneClient as User);

      expect(clientModel.find).toHaveBeenCalledWith({ 
        _id: { $in: userWithStandaloneClient.clientIds },
        isActive: true,
        isDeleted: false,
      });
      
      // Should not query for subsidiaries if none exist
      expect(clientModel.find).toHaveBeenCalledTimes(1); 

      expect(result).toEqual([standaloneClientId]);
    });

    it('should include both standalone clients and clients from subsidiaries', async () => {
      const standaloneId = toObjectId('65a9a1a7b8e5c6e2f1f4a4c1');
      const subsidiaryClientId = toObjectId('65a9a1a7b8e5c6e2f1f4a4c2');
      const otherSubsidiaryClientId = toObjectId('65a9a1a7b8e5c6e2f1f4a4c3');
      const subId = toObjectId('65a9a1a7b8e5c6e2f1f4a4a1');

      const user: Partial<User> = {
        clientIds: [standaloneId, subsidiaryClientId]
      };

      const assignedClients = [
        { _id: standaloneId, subsidiaryId: null },
        { _id: subsidiaryClientId, subsidiaryId: subId }
      ];

      const subsidiaryClients = [
        { _id: subsidiaryClientId },
        { _id: otherSubsidiaryClientId }
      ];

      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(assignedClients),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(subsidiaryClients),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(user as User);

      // Check results - should be unique union
      const resultStrings = result.map(id => id.toString()).sort();
      const expectedStrings = [standaloneId, subsidiaryClientId, otherSubsidiaryClientId].map(id => id.toString()).sort();
      
      expect(resultStrings).toEqual(expectedStrings);
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
      expect(clientModel.find).toHaveBeenCalledWith({ 
        _id: { $in: mockUser.clientIds },
        isActive: true,
        isDeleted: false,
      });
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

    // --- isActive and isDeleted Filtering Tests ---
    it('should exclude inactive clients from subsidiary scope resolution', async () => {
      const mixedStatusClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), isActive: true, isDeleted: false },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), isActive: false, isDeleted: false }, // INACTIVE - should be filtered out
      ];

      const activeAccessibleClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1') }, // Only active client returned
      ];

      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce([mixedStatusClients[0]]), // Only active client returned from first query
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(activeAccessibleClients),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(mockUser as User);

      // Verify that the query includes isActive: true filter
      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: mockUser.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([toObjectId('65a9a1a7b8e5c6e2f1f4a4c1')]);
      expect(result.length).toBe(1); // Only the active client
    });

    it('should exclude deleted clients from subsidiary scope resolution', async () => {
      const mixedStatusClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), isActive: true, isDeleted: false },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'), isActive: true, isDeleted: true }, // DELETED - should be filtered out
      ];

      const activeAccessibleClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1') }, // Only non-deleted client returned
      ];

      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce([mixedStatusClients[0]]), // Only non-deleted client returned from first query
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(activeAccessibleClients),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(mockUser as User);

      // Verify that the query includes isDeleted: false filter
      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: mockUser.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([toObjectId('65a9a1a7b8e5c6e2f1f4a4c1')]);
      expect(result.length).toBe(1); // Only the non-deleted client
    });

    it('should exclude both inactive and deleted clients from subsidiary scope resolution', async () => {
      const userWithMixedClients: Partial<User> = {
        clientIds: [
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), // Active, non-deleted
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), // Inactive
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c3'), // Deleted
        ]
      };

      const onlyActiveClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        // Only the active, non-deleted client is returned
      ];

      const accessibleClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1') },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c4') }, // Other active clients in same subsidiary
      ];

      (clientModel.find as jest.Mock)
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(onlyActiveClients),
        })
        .mockReturnValueOnce({
          select: jest.fn().mockReturnThis(),
          exec: jest.fn().mockResolvedValueOnce(accessibleClients),
        });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(userWithMixedClients as User);

      // Verify the filtering query includes both conditions
      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: userWithMixedClients.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(clientModel.find).toHaveBeenCalledWith({
        subsidiaryId: { $in: [toObjectId('65a9a1a7b8e5c6e2f1f4a4a1')] },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4c4')]);
    });

    it('should return empty array if all assigned clients are inactive or deleted', async () => {
      // User is assigned to clients that are all inactive or deleted
      const userWithInactiveClients: Partial<User> = {
        clientIds: [toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4c2')]
      };

      // First query returns empty because all clients are filtered out
      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce([]), // No active, non-deleted clients found
      });

      const result = await service.getAccessibleClientIdsForSubsidiaryScope(userWithInactiveClients as User);

      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: userWithInactiveClients.clientIds },
        isActive: true,
        isDeleted: false,
      });

      // Should only call find once since first query returns empty
      expect(clientModel.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });
  });

  describe('getAccessibleSubsidiaryIdsForUser', () => {
    
    // --- Happy Path Tests ---
    it('should correctly resolve subsidiary IDs from user\'s active, non-deleted clients', async () => {
      const mockClientsWithSubsidiaries = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a2') },
      ];

      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockClientsWithSubsidiaries),
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(mockUser as User);

      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: mockUser.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'),
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a2'),
      ]);
    });

    // --- Edge Cases ---
    it('should return empty array if user has no clientIds', async () => {
      const userWithoutClients: Partial<User> = { clientIds: [] };
      const result = await service.getAccessibleSubsidiaryIdsForUser(userWithoutClients as User);
      
      expect(result).toEqual([]);
      expect(clientModel.find).not.toHaveBeenCalled();
    });

    it('should return empty array if user.clientIds is null or undefined', async () => {
      const userWithNullClients: Partial<User> = { clientIds: null as any };
      const result = await service.getAccessibleSubsidiaryIdsForUser(userWithNullClients as User);
      
      expect(result).toEqual([]);
      expect(clientModel.find).not.toHaveBeenCalled();
    });

    it('should handle clients without subsidiaryId gracefully', async () => {
      const mockClientsWithMixedSubsidiaries = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: null }, // Independent client
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c3'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a2') },
      ];

      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockClientsWithMixedSubsidiaries),
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(mockUser as User);

      // Should only return subsidiaries for clients that have them
      expect(result).toEqual([
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'),
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a2'),
      ]);
    });

    it('should deduplicate subsidiary IDs if user has multiple clients in same subsidiary', async () => {
      const mockClientsWithDuplicateSubsidiaries = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') }, // Same subsidiary
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c3'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a2') },
      ];

      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(mockClientsWithDuplicateSubsidiaries),
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(mockUser as User);

      // Should return unique subsidiary IDs only
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a1'),
        toObjectId('65a9a1a7b8e5c6e2f1f4a4a2'),
      ]);
    });

    // --- isActive and isDeleted Filtering Tests ---
    it('should exclude inactive clients when resolving subsidiary IDs', async () => {
      const userWithMixedStatusClients: Partial<User> = {
        clientIds: [
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), // Active client
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), // Inactive client - should be filtered out
        ]
      };

      const onlyActiveClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        // Inactive client is filtered out by the query
      ];

      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(onlyActiveClients),
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(userWithMixedStatusClients as User);

      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: userWithMixedStatusClients.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([toObjectId('65a9a1a7b8e5c6e2f1f4a4a1')]);
      expect(result.length).toBe(1); // Only subsidiary from active client
    });

    it('should exclude deleted clients when resolving subsidiary IDs', async () => {
      const userWithMixedStatusClients: Partial<User> = {
        clientIds: [
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), // Non-deleted client
          toObjectId('65a9a1a7b8e5c6e2f1f4a4c2'), // Deleted client - should be filtered out
        ]
      };

      const onlyNonDeletedClients = [
        { _id: toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), subsidiaryId: toObjectId('65a9a1a7b8e5c6e2f1f4a4a1') },
        // Deleted client is filtered out by the query
      ];

      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce(onlyNonDeletedClients),
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(userWithMixedStatusClients as User);

      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: userWithMixedStatusClients.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([toObjectId('65a9a1a7b8e5c6e2f1f4a4a1')]);
      expect(result.length).toBe(1); // Only subsidiary from non-deleted client
    });

    it('should return empty array if all user clients are inactive or deleted', async () => {
      const userWithInactiveClients: Partial<User> = {
        clientIds: [toObjectId('65a9a1a7b8e5c6e2f1f4a4c1'), toObjectId('65a9a1a7b8e5c6e2f1f4a4c2')]
      };

      // All clients are filtered out due to being inactive or deleted
      (clientModel.find as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValueOnce([]), // No active, non-deleted clients found
      });

      const result = await service.getAccessibleSubsidiaryIdsForUser(userWithInactiveClients as User);

      expect(clientModel.find).toHaveBeenCalledWith({
        _id: { $in: userWithInactiveClients.clientIds },
        isActive: true,
        isDeleted: false,
      });

      expect(result).toEqual([]);
    });

    it('should propagate database errors', async () => {
      const dbError = new Error('Database connection failed');
      (clientModel.find as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockRejectedValue(dbError),
      });

      await expect(service.getAccessibleSubsidiaryIdsForUser(mockUser as User)).rejects.toThrow('Database connection failed');
    });
  });
});