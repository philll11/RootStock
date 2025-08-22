import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Connection, Types } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { VisibilityService } from './visibility.service';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';
import { User } from '../../users/schemas/user.schema';
import { VisibilityScope } from '../../roles/schemas/role.schema';

// Helper function to create mock users, adapted from the reference test file.
const createMockUser = (
    scope: VisibilityScope,
    clientIds: string[] = [],
    permissions: string[] = [],
): User =>
({
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
        name: 'Mock Role',
        permissions,
        visibilityScope: scope,
    },
    clientIds: clientIds.map((id) => new Types.ObjectId(id)),
} as any);

describe('VisibilityService', () => {
    let service: VisibilityService;
    let clientResolverService: ClientResolverService;
    let connection: Connection;

    // Mock for the ClientResolverService dependency
    const mockClientResolverService = {
        getAccessibleClientIdsForSubsidiaryScope: jest.fn(),
    };

    // Mock for the Mongoose Connection and its chained methods
    const mockModel = {
        findById: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn(),
    };

    const mockConnection = {
        model: jest.fn().mockReturnValue(mockModel),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VisibilityService,
                {
                    provide: ClientResolverService,
                    useValue: mockClientResolverService,
                },
                {
                    provide: 'DatabaseConnection', // Use the token NestJS uses for InjectConnection
                    useValue: mockConnection,
                },
            ],
        }).compile();

        service = module.get<VisibilityService>(VisibilityService);
        clientResolverService = module.get<ClientResolverService>(ClientResolverService);
        connection = module.get<Connection>('DatabaseConnection');

        // Clear all mock history before each test
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateClientAccess', () => {
        const clientId1 = '60f8f1b3b5f9f1b3b5f9f1a1';
        const clientId2 = '60f8f1b3b5f9f1b3b5f9f1a2';
        const clientId3 = '60f8f1b3b5f9f1b3b5f9f1a3'; // An unauthorized client

        // --- Happy Paths ---
        it('should resolve successfully for a GLOBAL user, regardless of clients', async () => {
            const globalUser = createMockUser(VisibilityScope.GLOBAL);
            await expect(service.validateClientAccess([clientId1, clientId2], globalUser)).resolves.toBeUndefined();
        });

        it('should resolve for a CLIENT user accessing their own assigned clients', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [clientId1, clientId2]);
            await expect(service.validateClientAccess([clientId1, clientId2], clientUser)).resolves.toBeUndefined();
        });

        it('should resolve for a SUBSIDIARY user accessing clients within their scope', async () => {
            const subsidiaryUser = createMockUser(VisibilityScope.SUBSIDIARY, [clientId1]);
            const accessibleIds = [clientId1, clientId2].map((id) => new Types.ObjectId(id));
            mockClientResolverService.getAccessibleClientIdsForSubsidiaryScope.mockResolvedValue(accessibleIds);

            await expect(service.validateClientAccess([clientId2], subsidiaryUser)).resolves.toBeUndefined();
            expect(clientResolverService.getAccessibleClientIdsForSubsidiaryScope).toHaveBeenCalledWith(subsidiaryUser);
        });

        // --- Non-Happy Paths ---
        it('should throw ForbiddenException for a CLIENT user accessing an unassigned client', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [clientId1]);
            await expect(service.validateClientAccess([clientId1, clientId3], clientUser)).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('should throw ForbiddenException for a SUBSIDIARY user accessing a client outside their scope', async () => {
            const subsidiaryUser = createMockUser(VisibilityScope.SUBSIDIARY, [clientId1]);
            const accessibleIds = [clientId1, clientId2].map((id) => new Types.ObjectId(id));
            mockClientResolverService.getAccessibleClientIdsForSubsidiaryScope.mockResolvedValue(accessibleIds);

            await expect(service.validateClientAccess([clientId3], subsidiaryUser)).rejects.toThrow(ForbiddenException);
        });

        it('should throw ForbiddenException if the user context has no roleId', async () => {
            const userWithoutRole = { ...createMockUser(VisibilityScope.CLIENT), roleId: null } as any;
            await expect(service.validateClientAccess([clientId1], userWithoutRole)).rejects.toThrow(
                'Invalid user context for client validation.',
            );
        });
    });

    describe('validateResourceAccessByClientId', () => {
        const resourceId = '70f8f1b3b5f9f1b3b5f9f1b1';
        const parentClientId = '60f8f1b3b5f9f1b3b5f9f1a1';
        const unauthorizedClientId = '60f8f1b3b5f9f1b3b5f9f1a9';
        const resourceModelName = 'Orchard';

        // --- Happy Path ---
        it('should resolve if the resource is found and the user has access to its clientId', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [parentClientId]);
            mockModel.exec.mockResolvedValue({ clientId: new Types.ObjectId(parentClientId) });

            await expect(
                service.validateResourceAccessByClientId(resourceId, resourceModelName, clientUser),
            ).resolves.toBeUndefined();

            expect(mockConnection.model).toHaveBeenCalledWith(resourceModelName);
            expect(mockModel.findById).toHaveBeenCalledWith(resourceId);
        });

        // --- Non-Happy Paths ---
        it('should throw ForbiddenException if the user does NOT have access to the resource’s clientId', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [unauthorizedClientId]);
            mockModel.exec.mockResolvedValue({ clientId: new Types.ObjectId(parentClientId) });

            await expect(
                service.validateResourceAccessByClientId(resourceId, resourceModelName, clientUser),
            ).rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException if the resource cannot be found', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [parentClientId]);
            mockModel.exec.mockResolvedValue(null); // Simulate not finding the document

            await expect(
                service.validateResourceAccessByClientId(resourceId, resourceModelName, clientUser),
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw an Error if the found resource is missing a clientId (schema misconfiguration)', async () => {
            const clientUser = createMockUser(VisibilityScope.CLIENT, [parentClientId]);
            mockModel.exec.mockResolvedValue({ _id: resourceId }); // Found, but no clientId

            await expect(
                service.validateResourceAccessByClientId(resourceId, resourceModelName, clientUser),
            ).rejects.toThrow(`Resource ${resourceModelName} with ID ${resourceId} does not have a 'clientId' field for validation.`);
        });
    });
});