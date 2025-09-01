import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { ClientSession, Connection, Model, Types } from 'mongoose';

import { handleConcurrentSoftDelete } from "../common/utils/concurrent-deletion.util";

import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { OrchardQueryBuilder } from './builders/orchards-query.builder';

import { ClientsService } from '../clients/clients.service';
import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CountersService } from '../counters/counters.service';


@Injectable()
export class OrchardsService {
    constructor(
        @InjectModel(Orchard.name) private orchardModel: Model<OrchardDocument>,
        @InjectConnection() private connection: Connection,
        private readonly clientResolverService: ClientResolverService,
        @Inject(forwardRef(() => ClientsService))
        private readonly clientsService: ClientsService,
        private readonly countersService: CountersService,
        private readonly usersService: UsersService,
    ) { }

    async create(createOrchardDto: CreateOrchardDto, user: UserDocument): Promise<OrchardDocument> {
        const { clientId, userIds } = createOrchardDto;

        await this.clientsService.findOne(clientId, user); // Layer 2 Client Check

        if (userIds && userIds.length > 0) {
            await Promise.all(userIds.map(uid => this.usersService.findOne(uid, user))); // Layer 2 User Check
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
            return savedOrchard;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async findAll(query: QueryOrchardDto, user: UserDocument): Promise<OrchardDocument[]> {
        const queryBuilder = new OrchardQueryBuilder(query, user, this.clientResolverService);
        const filter = await queryBuilder.build();
        return this.orchardModel.find(filter)
            .populate('clientId', 'name recordId')
            .populate('userIds', 'name recordId userType') // Populate assigned users
            .exec();
    }

    async findAllByClientId(clientId: string, query: QueryOrchardDto, user: UserDocument): Promise<OrchardDocument[]> {
        const queryBuilder = new OrchardQueryBuilder(query, user, this.clientResolverService);
        const filter = await queryBuilder.build();
        filter.clientId = new Types.ObjectId(clientId);
        return this.orchardModel.find(filter).exec();
    }

    async findOne(orchardId: string, user: UserDocument, options: { includeInactive?: boolean } = {}): Promise<OrchardDocument> {
        const queryDto = options.includeInactive ? { includeInactives: true } : {};
        const queryBuilder = new OrchardQueryBuilder(queryDto, user, this.clientResolverService);
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

    async update(orchardId: string, updateOrchardDto: UpdateOrchardDto, user: UserDocument): Promise<OrchardDocument> {
        const targetOrchard = await this.findOne(orchardId, user, { includeInactive: true }); // Layer 2 Orchard Check and fetch target orchard
        const targetClientIdString = (targetOrchard.clientId as any)._id.toString();

        const { userIds, ...restOfDto } = updateOrchardDto;

        if (userIds) {
            await Promise.all(userIds.map(uid => this.usersService.findOne(uid, user))); // Layer 2 User Check
        }

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            // Update the base orchard fields first.
            const updatedOrchard = await this.orchardModel.findByIdAndUpdate(
                orchardId,
                { $set: restOfDto },
                { new: true, session },
            ).exec();

            if (!updatedOrchard) {
                throw new NotFoundException(`Orchard with ID "${orchardId}" could not be updated.`);
            }

            if (userIds) {
                await this._performUserAssignmentsInTransaction(targetClientIdString, userIds, session); // Smart Assignment: assign parent Client to incoming Users
                updatedOrchard.userIds = userIds.map(id => new Types.ObjectId(id));
                await updatedOrchard.save({ session });
            }

            await session.commitTransaction();
            return updatedOrchard;
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    async remove(orchardId: string, user: UserDocument): Promise<OrchardDocument> {
        await this.findOne(orchardId, user); // Layer 2 Orchard Check

        // TODO: Add Layer 3 check for active child Blocks before deletion.

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const deletedOrchard = await handleConcurrentSoftDelete<OrchardDocument>(this.orchardModel, orchardId, session, "Orchard");

            // In the future, if an Orchard had children that needed to be soft-deleted,
            // that logic would go here, using the same session.
            // e.g., await this.blocksService.softDeleteByOrchardId(orchardId, session);

            await session.commitTransaction();
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