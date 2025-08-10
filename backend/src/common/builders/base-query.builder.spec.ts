import { ForbiddenException } from '@nestjs/common';
import { BaseQueryBuilder } from './base-query.builder';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

const createMockUser = (roleName: string, scope: VisibilityScope, clientIds: string[] = []): User => ({
  _id: new Types.ObjectId(),
  recordId: 'USER_MOCK_001',
  name: 'Mock User',
  firstName: 'Mock',
  lastName: 'User',
  userType: 'employee',
  isActive: true,
  isDeleted: false,
  roleId: {
    _id: new Types.ObjectId(),
    name: roleName,
    permissions: [],
    visibilityScope: scope,
    isActive: true,
    isDeleted: false,
  } as any,
  clientIds: clientIds.map(id => new Types.ObjectId(id)),
} as any);

describe('BaseQueryBuilder', () => {
  // MODIFIED: A more sophisticated mock that simulates Mongoose's chainable methods
  const mockClientModel = {
    find: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Status and Search Filters', () => {
    const adminUser = createMockUser('Administrator', VisibilityScope.GLOBAL);
    const growerUser = createMockUser('Grower', VisibilityScope.CLIENT, []); // User with Client scope but no assigned clients

    // MODIFIED: Updated the test to reflect the new default behavior
    it('should create a default filter including an empty visibility scope for a client-scoped user', async () => {
      const query = {};
      
      // We must create a test-specific builder to override applyVisibilityScope's field name
      class TestBuilder extends BaseQueryBuilder {
        protected async applyVisibilityScope() {
          await super.applyVisibilityScope('clientId');
        }
      }
      const builder = new TestBuilder(query, growerUser, mockClientModel as any);
      const filter = await builder.build();

      expect(filter).toEqual({
        clientId: { $in: [] }, // This is the new, correct default for this user
        isDeleted: false,
        isActive: true,
      });
    });

    it('should return non-deleted records, both active and inactive, when includeInactives is true', async () => {
      const query = { includeInactives: true };
      const builder = new BaseQueryBuilder(query, adminUser, mockClientModel as any);
      const filter = await builder.build();
      // Global user has no extra filters
      expect(filter).toEqual({ isDeleted: false, isActive: { $in: [true, false] } });
    });
  });

  describe('Visibility Scope Filtering', () => {
    const clientId1 = '60f8f1b3b5f9f1b3b5f9f1a1';
    const clientId2 = '60f8f1b3b5f9f1b3b5f9f1a2';
    const subId1 = '70f8f1b3b5f9f1b3b5f9f1b1';

    it('should apply NO visibility filter for a user with Global scope', async () => {
      const globalUser = createMockUser('Administrator', VisibilityScope.GLOBAL);
      const builder = new BaseQueryBuilder({}, globalUser, mockClientModel as any);
      const filter = await builder.build();
      expect(filter.clientId).toBeUndefined();
      expect(filter).toEqual({ isDeleted: false, isActive: true });
    });

    it('should apply a filter for assigned clientIds for a user with Client scope', async () => {
      const clientUser = createMockUser('Grower', VisibilityScope.CLIENT, [clientId1, clientId2]);
      class TestBuilder extends BaseQueryBuilder {
        protected async applyVisibilityScope() {
          await super.applyVisibilityScope('clientId');
        }
      }
      const builder = new TestBuilder({}, clientUser, mockClientModel as any);
      const filter = await builder.build();

      expect(filter.clientId).toBeDefined();
      expect(filter.clientId.$in.map(String)).toEqual([clientId1, clientId2]);
    });

    // MODIFIED: This test now uses the chainable mock
    it('should apply a filter for accessible subsidiary clients for a user with Subsidiary scope', async () => {
      const consultantUser = createMockUser('Consultant', VisibilityScope.SUBSIDIARY, [clientId1]);
      const mockAssignedClients = [{ _id: new Types.ObjectId(clientId1), subsidiaryId: new Types.ObjectId(subId1) }];
      const mockAccessibleClients = [{ _id: new Types.ObjectId(clientId1) }, { _id: new Types.ObjectId(clientId2) }];
      
      // Configure the mock's chained behavior
      mockClientModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn()
          .mockResolvedValueOnce(mockAssignedClients)
          .mockResolvedValueOnce(mockAccessibleClients),
      });

      class TestBuilder extends BaseQueryBuilder {
        protected async applyVisibilityScope() {
          await super.applyVisibilityScope('clientId');
        }
      }
      const builder = new TestBuilder({}, consultantUser, mockClientModel as any);
      const filter = await builder.build();
      
      expect(filter.clientId).toBeDefined();
      expect(filter.clientId.$in.map(String)).toEqual([clientId1, clientId2]);
      
      expect(mockClientModel.find).toHaveBeenCalledWith({ _id: { $in: [new Types.ObjectId(clientId1)] } });
      expect(mockClientModel.find).toHaveBeenCalledWith({ subsidiaryId: { $in: [new Types.ObjectId(subId1)] } });
    });
  });
});