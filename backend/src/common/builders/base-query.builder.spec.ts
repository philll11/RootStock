import { BaseQueryBuilder } from './base-query.builder';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';
import { PERMISSIONS, Resource } from '../constants/permissions.constants';

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
  const mockClientResolverService = {
    getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
    getAccessibleSubsidiaryIdsForUser: jest.fn(),
  } as any;

  // Reset mocks before each test to ensure isolation
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Inactive Record Access Control - Business Logic', () => {
    it('should allow managers with Client:ManageInactive permission to see all client records including inactive ones', async () => {
      const query = { includeInactives: true };
      const clientManagerUser = createMockUser('ClientManager', VisibilityScope.GLOBAL);
      // Grant the specific Client:ManageInactive permission
      (clientManagerUser.roleId as any).permissions = ['Client:ManageInactive'];
      
      const builder = new BaseQueryBuilder(query, clientManagerUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      // Manager can access inactive client records for business operations
      expect(filter).toEqual({ isDeleted: false });
    });

    it('should prevent standard users from accessing inactive client records even when requested', async () => {
      const query = { includeInactives: true };
      const standardOperatorUser = createMockUser('StandardUser', VisibilityScope.GLOBAL);
      // Ensure user does NOT have the Client:ManageInactive permission
      (standardOperatorUser.roleId as any).permissions = [];
      
      const builder = new BaseQueryBuilder(query, standardOperatorUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      // Security boundary: standard users cannot bypass active-only filtering
      expect(filter).toEqual({ isDeleted: false, isActive: true });
    });

    it('should maintain default active-only behavior when inactive records are not explicitly requested', async () => {
      const query = {};
      const anyUser = createMockUser('AnyUser', VisibilityScope.GLOBAL);
      
      const builder = new BaseQueryBuilder(query, anyUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      // Default business behavior: only show active, operational records
      expect(filter).toEqual({ isDeleted: false, isActive: true });
    });

    it('should deny access to inactive records even when user has other administrative permissions', async () => {
      const query = { includeInactives: true };
      const partialAdminUser = createMockUser('PartialAdmin', VisibilityScope.GLOBAL);
      // User has other administrative permissions but NOT Client:ManageInactive
      (partialAdminUser.roleId as any).permissions = ['Client:View', 'Client:Edit', 'User:View'];
      
      const builder = new BaseQueryBuilder(query, partialAdminUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      // Security principle: permissions are specific and non-transferable
      expect(filter).toEqual({ isDeleted: false, isActive: true });
    });

    it('should enforce resource-specific permission boundaries between different entity types', async () => {
      const query = { includeInactives: true };
      const userManagerRole = createMockUser('UserManager', VisibilityScope.GLOBAL);
      // User has ManageInactive permission for Users but not for Clients
      (userManagerRole.roleId as any).permissions = ['User:ManageInactive', 'Client:View'];
      
      const builder = new BaseQueryBuilder(query, userManagerRole, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      // Business rule: User management permissions do not grant client management permissions
      expect(filter).toEqual({ isDeleted: false, isActive: true });
    });
  });

  describe('Status and Search Filters', () => {
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
      const builder = new TestBuilder(query, growerUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();

      expect(filter).toEqual({
        clientId: { $in: [] }, // This is the new, correct default for this user
        isDeleted: false,
        isActive: true,
      });
    });
  });

  describe('Visibility Scope Filtering', () => {
    const clientId1 = '60f8f1b3b5f9f1b3b5f9f1a1';
    const clientId2 = '60f8f1b3b5f9f1b3b5f9f1a2';
    const subId1 = '70f8f1b3b5f9f1b3b5f9f1b1';

    it('should apply NO visibility filter for a user with Global scope', async () => {
      const globalUser = createMockUser('Administrator', VisibilityScope.GLOBAL);
      const builder = new BaseQueryBuilder({}, globalUser, mockClientResolverService, Resource.CLIENT);
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
      const builder = new TestBuilder({}, clientUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();

      expect(filter.clientId).toBeDefined();
      expect(filter.clientId.$in.map(String)).toEqual([clientId1, clientId2]);
    });

    // MODIFIED: This test now uses the chainable mock
    it('should apply a filter for accessible subsidiary clients for a user with Subsidiary scope', async () => {
      const consultantUser = createMockUser('Consultant', VisibilityScope.SUBSIDIARY, [clientId1]);
      mockClientResolverService.getAccessibleClientIdsForSubsidiaryScope.mockResolvedValueOnce([
        new Types.ObjectId(clientId1),
        new Types.ObjectId(clientId2)
      ]);

      class TestBuilder extends BaseQueryBuilder {
        protected async applyVisibilityScope() {
          await super.applyVisibilityScope('clientId');
        }
      }
      const builder = new TestBuilder({}, consultantUser, mockClientResolverService, Resource.CLIENT);
      const filter = await builder.build();
      
      expect(filter.clientId).toBeDefined();
      expect(filter.clientId.$in.map(String)).toEqual([clientId1, clientId2]);
      
      expect(mockClientResolverService.getAccessibleClientIdsForSubsidiaryScope).toHaveBeenCalledWith(consultantUser);
    });
  });
});