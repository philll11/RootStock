// backend/src/orchards/orchards.service.ts
import { Injectable, NotFoundException, Inject, forwardRef, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import { handleConcurrentSoftDelete } from "../../common/utils/concurrent-deletion.util";

import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { OrchardQueryBuilder } from './builders/orchards-query.builder';

import { ClientsService } from '../../iam/clients/clients.service';
import { ClientResolverService } from '../../iam/client-resolver/client-resolver.service';

import { UserDocument } from '../../iam/users/schemas/user.schema';
import { UsersService } from '../../iam/users/users.service';
import { CountersService } from '../../system/counters/counters.service';

import { BlocksService } from '../blocks/blocks.service';

import { PERMISSIONS, Resource } from '../../common/constants/permissions.constants';
import { AuditsService } from '../../system/audits/audits.service';
import { AuditAction } from '../../system/audits/schemas/audit.schema';


@Injectable()
export class OrchardsService {
    constructor(
        @InjectModel(Orchard.name) private orchardModel: Model<OrchardDocument>,
        @InjectConnection() private connection: Connection,
        @Inject(forwardRef(() => ClientsService)) private readonly clientsService: ClientsService,
        @Inject(forwardRef(() => BlocksService)) private readonly blocksService: BlocksService,
        @Inject(forwardRef(() => UsersService)) private readonly usersService: UsersService,
        @Inject(forwardRef(() => AuditsService)) private readonly auditsService: AuditsService,
        private readonly clientResolverService: ClientResolverService,
        private readonly countersService: CountersService,
    ) { }

    async create(createOrchardDto: CreateOrchardDto, requestingUser: UserDocument): Promise<OrchardDocument> {
        const { clientId, userIds } = createOrchardDto;

        await this.clientsService.findOne(clientId, requestingUser); // Layer 2 Client Check

        if (userIds && userIds.length > 0) {
            await Promise.all(userIds.map(uid => this.usersService.findOne(uid, requestingUser))); // Layer 2 User Check
        }

        const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('orchard', 'ORC');
        const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

        const newOrchard = new this.orchardModel({
            ...createOrchardDto,
            recordId,
            clientId: new Types.ObjectId(clientId),
            userIds: [],
        });

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const savedOrchard = await newOrchard.save({ session });

            if (userIds && userIds.length > 0) {
                await this._performUserAssignmentsInTransaction(clientId, userIds, session); // Smart Assignment: assign parent Client to incoming Users
                savedOrchard.userIds = userIds.map(id => new Types.ObjectId(id));
                await savedOrchard.save({ session });
            }

            await session.commitTransaction();

            await this.auditsService.log(
                Resource.ORCHARD,
                savedOrchard._id.toString(),
                AuditAction.CREATE,
                null,
                savedOrchard.toObject(),
                requestingUser._id.toString(),
                'Orchard Created'
            );

            return savedOrchard;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async findAll(query: QueryOrchardDto, requestingUser: UserDocument): Promise<OrchardDocument[]> {
        const queryBuilder = new OrchardQueryBuilder(query, requestingUser, this.clientResolverService);
        const filter = await queryBuilder.build();
        return this.orchardModel.find(filter)
            .populate('clientId', 'name recordId')
            .populate('userIds', 'name recordId userType') // Populate assigned users
            .exec();
    }

    async findAllByClientId(clientId: string, query: QueryOrchardDto, requestingUser: UserDocument): Promise<OrchardDocument[]> {
        const queryBuilder = new OrchardQueryBuilder(query, requestingUser, this.clientResolverService);
        const filter = await queryBuilder.build();
        filter.clientId = new Types.ObjectId(clientId);
        return this.orchardModel.find(filter).exec();
    }

    async findOne(orchardId: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<OrchardDocument> {
        const queryDto = options.includeInactive ? { includeInactives: true } : {};
        const queryBuilder = new OrchardQueryBuilder(queryDto, requestingUser, this.clientResolverService);
        const securityFilter = await queryBuilder.build();
        const finalFilter = { $and: [securityFilter, { _id: new Types.ObjectId(orchardId) }] };

        const orchard = await this.orchardModel.findOne(finalFilter)
            .populate('clientId', 'name recordId')
            .populate('userIds', 'name recordId userType') // Populate assigned users
            .exec();
        if (!orchard) {
            throw new NotFoundException(`Orchard with ID "${orchardId}" not found or you do not have permission to view it.`);
        }
        return orchard;
    }

    async update(orchardId: string, updateOrchardDto: UpdateOrchardDto, requestingUser: UserDocument): Promise<OrchardDocument> {
        const targetOrchard = await this.findOne(orchardId, requestingUser, { includeInactive: true }); // Layer 2 Orchard Check and fetch target orchard
        const targetClientIdString = (targetOrchard.clientId as any)._id.toString();

        const { userIds, isActive, __v, ...restOfDto } = updateOrchardDto;
        const updatePayload: any = { ...restOfDto };

        // System Constraint: Only roles with ORCHARD_MANAGE_INACTIVE permissions can change Orchard status.
        if (updateOrchardDto.isActive !== undefined) {
            const userPermissions = (requestingUser.roleId as any)?.permissions || [];
            if (!userPermissions.includes(PERMISSIONS.ORCHARD_MANAGE_INACTIVE)) {
                throw new ForbiddenException('You do not have permission to change the isActive status of an orchard.');
            }
            updatePayload.isActive = updateOrchardDto.isActive;
        }

        if (userIds) {
            // Layer 2 User Check - ensure all incoming userIds are visible to requestingUser
            await Promise.all(userIds.map(uid => this.usersService.findOne(uid, requestingUser)));
        }

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            if (userIds) {
                await this._performUserAssignmentsInTransaction(targetClientIdString, userIds, session); // Smart Assignment: assign parent Client to incoming Users
            }

            if (userIds) {
                updatePayload.userIds = userIds.map(id => new Types.ObjectId(id));
            }

            const updatedOrchard = await this.orchardModel.findOneAndUpdate(
                { _id: orchardId, __v: updateOrchardDto.__v },
                { $set: updatePayload, $inc: { __v: 1 } },
                { new: true, session }
            ).exec();

            if (!updatedOrchard) {
                const exists = await this.orchardModel.exists({ _id: orchardId });
                if (exists) {
                    throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
                } else {
                    throw new NotFoundException(`Orchard with ID "${orchardId}" could not be updated.`);
                }
            }

            await session.commitTransaction();

            await this.auditsService.log(
                Resource.ORCHARD,
                updatedOrchard._id.toString(),
                AuditAction.UPDATE,
                targetOrchard.toObject(),
                updatedOrchard.toObject(),
                requestingUser._id.toString(),
                'Orchard Updated'
            );

            return updatedOrchard;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async remove(orchardId: string, requestingUser: UserDocument): Promise<OrchardDocument> {
        const orchardToDelete = await this.findOne(orchardId, requestingUser); // Layer 2 Orchard Check

        const activeBlockCount = await this.blocksService.countActiveByOrchardId(orchardId);
        if (activeBlockCount > 0) {
            throw new ConflictException(`Cannot delete orchard because it has ${activeBlockCount} active block(s).`);
        }

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const deletedOrchard = await handleConcurrentSoftDelete<OrchardDocument>(this.orchardModel, orchardId, session, "Orchard");

            await session.commitTransaction();

            await this.auditsService.log(
                Resource.ORCHARD,
                orchardId,
                AuditAction.DELETE,
                orchardToDelete.toObject(),
                null,
                requestingUser._id.toString(),
                'Orchard Deleted'
            );

            return deletedOrchard;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }


    async validateOrchardIds(orchardIds: string[]): Promise<boolean> {
        if (!orchardIds || orchardIds.length === 0) {
            return true;
        }
        const activeOrchardsCount = await this.orchardModel.countDocuments({
            _id: { $in: orchardIds.map(id => new Types.ObjectId(id)) },
            isActive: true,
            isDeleted: false,
        });
        return activeOrchardsCount === orchardIds.length;
    }

    /**
/**
 * Private helper that performs the database operations for Smart Assignment.
 * Validation should happen before this method is called.
 * @private
 */
    private async _performUserAssignmentsInTransaction(parentClientId: string, userIdsToAssign: string[], session: ClientSession): Promise<void> {
        if (userIdsToAssign.length === 0) return; // If an empty array is passed, interpret  as "unassign all users from this orchard".

        // The core of "Smart Assignment": atomically add the parent client to any user who doesn't have it.
        await this.usersService['userModel'].updateMany(
            { _id: { $in: userIdsToAssign } },
            { $addToSet: { clientIds: new Types.ObjectId(parentClientId) } },
            { session },
        ).exec();
    }

    /**
* Counts active, non-deleted orchards associated with a specific client.
* Used as a pre-condition check before deactivating a client.
* @param clientId The ID of the parent client.
* @returns The number of active orchards assigned to the client.
*/
    async countActiveByClientId(clientId: string): Promise<number> {
        return this.orchardModel.countDocuments({
            clientId: new Types.ObjectId(clientId),
            isActive: true,
            isDeleted: false,
        }).exec();
    }

    /**
 * Soft-deletes all orchards belonging to a specific client.
 * This is designed to be called from within a transaction when a client is deleted.
 * @param clientId The ID of the parent client.
 * @param session The Mongoose ClientSession to use for the transaction.
 */
    async softDeleteByClientId(clientId: string, session: ClientSession): Promise<void> {
        await this.orchardModel.updateMany(
            { clientId: new Types.ObjectId(clientId) },
            { isDeleted: true, isActive: false },
            { session }
        ).exec();
    }
}