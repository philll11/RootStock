import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ClientResolverService } from '../../clients/client-resolver/client-resolver.service';
import { VisibilityScope } from '../../roles/schemas/role.schema';
import { User } from '../../users/schemas/user.schema';

/**
 * Defines the minimum required shape for a document to be validated by this service.
 * Any Mongoose model whose visibility is governed by a parent Client should have this field.
 */
interface IClientBoundResource {
    clientId: Types.ObjectId;
}

@Injectable()
export class VisibilityService {
    constructor(
        private readonly clientResolverService: ClientResolverService,
        @InjectConnection() private readonly connection: Connection,
    ) { }

    /**
     * Generic access validator for any resource linked to a Client.
     * Checks if a user has access to a resource by validating their access to the resource's parent Client.
     * @param resourceId The _id of the resource to check.
     * @param resourceModelName The Mongoose model name.
     * @param requestingUser The user performing the action.
     */
    async validateResourceAccessByClientId(resourceId: string, resourceModelName: string, requestingUser: User,): Promise<void> {
        const resourceModel = this.connection.model<IClientBoundResource>(resourceModelName);

        const resource = await resourceModel
            .findById(resourceId)
            .select('clientId')
            .lean()
            .exec();

        if (!resource) {
            throw new NotFoundException(`${resourceModelName} with ID "${resourceId}" not found.`);
        }

        if (!resource.clientId) {
            throw new Error(`Resource ${resourceModelName} with ID ${resourceId} does not have a 'clientId' field for validation.`);
        }

        await this.validateSingleClientAccess(resource.clientId.toString(), requestingUser);
    }

    /**
     * Validates that a user can access a single client based on their visibility scope.
     * Throws a ForbiddenException if access is denied.
     * @param clientId The ID of the client to validate.
     * @param requestingUser The user performing the action.
     */
    async validateSingleClientAccess(clientId: string, requestingUser: User): Promise<void> {
        await this.validateClientAccess([clientId], requestingUser);
    }

    /**
     * Validates that the requesting user has access to assign the specified client IDs.
     * This is the root method for all client-based visibility checks, used directly by UsersService.
     * @param clientIds An array of client IDs to validate.
     * @param requestingUser The user performing the action.
     */
    async validateClientAccess(clientIds: string[], requestingUser: User): Promise<void> {
        if (!requestingUser || !requestingUser.roleId) {
            throw new ForbiddenException('Invalid user context for client validation.');
        }

        const userRole = requestingUser.roleId as any;
        const visibilityScope = userRole.visibilityScope;

        if (visibilityScope === VisibilityScope.GLOBAL) return;

        // Business Rule: Client IDs must be provided for non-global users.
        if (clientIds.length === 0) {
            throw new ForbiddenException('You do not have permission to access resources with no client assignment.');
        }

        let accessibleClientIds: Types.ObjectId[];

        if (visibilityScope === VisibilityScope.CLIENT) {
            accessibleClientIds = requestingUser.clientIds || [];
        } else if (visibilityScope === VisibilityScope.SUBSIDIARY) {
            accessibleClientIds =
                await this.clientResolverService.getAccessibleClientIdsForSubsidiaryScope(requestingUser);
        } else {
            throw new ForbiddenException('Unknown visibility scope.');
        }

        const accessibleClientIdStrings = accessibleClientIds.map((id) => id.toString());

        const unauthorizedClients = clientIds.filter(
            (clientId) => !accessibleClientIdStrings.includes(clientId),
        );

        if (unauthorizedClients.length > 0) {
            throw new ForbiddenException(
                `You do not have permission to assign or use clients: ${unauthorizedClients.join(', ')}`,
            );
        }
    }
}