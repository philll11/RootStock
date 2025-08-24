import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { VisibilityService } from '../common/visibility/visibility.service';

import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { OrchardQueryBuilder } from './builders/orchards-query.builder';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { User } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { CountersService } from '../counters/counters.service';

@Injectable()
export class OrchardsService {
    constructor(
        @InjectModel(Orchard.name) private orchardModel: Model<OrchardDocument>,
        private readonly clientResolverService: ClientResolverService,
        private readonly countersService: CountersService,
        private readonly visibilityService: VisibilityService,
        private readonly usersService: UsersService,
    ) { }

    async create(createOrchardDto: CreateOrchardDto, user: User): Promise<Orchard> {
        const { clientId, userIds } = createOrchardDto;

        // This block ensures the user has access to the client and the users being assigned.
        await this.visibilityService.validateSingleClientAccess(clientId, user);
        if (userIds && userIds.length > 0) {
            await Promise.all(userIds.map(uid => this.usersService.findOne(uid, user)));
            await this.validateUsersBelongToClient(userIds, clientId);
        }

        const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('orchard', 'ORC');
        const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

        const newOrchard = new this.orchardModel({
            ...createOrchardDto,
            recordId,
            clientId: new Types.ObjectId(clientId), // Convert clientId string to ObjectId
            userIds: userIds ? userIds.map(id => new Types.ObjectId(id)) : [],
        });
        return newOrchard.save();
    }

    async findAll(query: QueryOrchardDto, user: User): Promise<Orchard[]> {
        const queryBuilder = new OrchardQueryBuilder(query, user, this.clientResolverService);
        const filter = await queryBuilder.build();
        return this.orchardModel.find(filter)
            .populate('clientId', 'name recordId')
            .populate('userIds', 'name recordId userType') // Populate assigned users
            .exec();
    }

    async findAllByClientId(clientId: string, query: QueryOrchardDto, user: User): Promise<Orchard[]> {
        const queryBuilder = new OrchardQueryBuilder(query, user, this.clientResolverService);
        const filter = await queryBuilder.build();
        filter.clientId = new Types.ObjectId(clientId);
        return this.orchardModel.find(filter).exec();
    }

    async findOne(orchardId: string, user: User, options: { includeInactive?: boolean } = {}): Promise<Orchard> {
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

    async update(orchardId: string, updateOrchardDto: UpdateOrchardDto, user: User): Promise<Orchard> {
        const targetOrchard = await this.findOne(orchardId, user, { includeInactive: true });

        const { clientId, userIds } = updateOrchardDto;
        const targetClientIdString = targetOrchard.clientId._id.toString();
        const finalClientId = clientId || targetClientIdString;

        // This block ensures the user has access to the client and the users being assigned.
        if (clientId && clientId !== targetClientIdString) {
            await this.visibilityService.validateSingleClientAccess(clientId, user);
        }
        if (userIds) {
            if (userIds.length > 0) {
                await Promise.all(userIds.map(uid => this.usersService.findOne(uid, user)));
            }
            await this.validateUsersBelongToClient(userIds, finalClientId);
        }

        const updatePayload: Partial<UpdateOrchardDto> = { ...updateOrchardDto };

        if (updateOrchardDto.clientId) {
            updatePayload.clientId = new Types.ObjectId(updateOrchardDto.clientId) as any;
        }
        if (updateOrchardDto.userIds) {
            updatePayload.userIds = updateOrchardDto.userIds.map(id => new Types.ObjectId(id)) as any;
        }

        const updatedOrchard = await this.orchardModel.findByIdAndUpdate(
            orchardId,
            { $set: updatePayload },
            { new: true, runValidators: true },
        ).exec();

        if (!updatedOrchard) {
            throw new NotFoundException(`Orchard with ID "${orchardId}" could not be updated.`);
        }
        return updatedOrchard;
    }

    async remove(orchardId: string, user: User): Promise<Orchard> {

        await this.visibilityService.validateResourceAccessByClientId(orchardId, Orchard.name, user);

        const deletedOrchard = await this.orchardModel.findByIdAndUpdate(
            orchardId,
            { isDeleted: true, isActive: false },
            { new: true },
        ).exec();

        if (!deletedOrchard) {
            throw new NotFoundException(`Orchard with ID "${orchardId}" not found.`);
        }
        return deletedOrchard;
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
 * Business Rule: Ensures all provided contact user IDs belong to the target client.
 * @private
 */
    private async validateUsersBelongToClient(userIds: string[], targetClientId: string): Promise<void> {
        if (userIds.length === 0) return;

        const usersToAssign = await this.usersService['userModel'].find({
            _id: { $in: userIds }
        }).select('clientIds recordId').lean().exec();

        for (const user of usersToAssign) {
            const userClientIds = user.clientIds.map(id => id.toString());
            if (!userClientIds.includes(targetClientId)) {
                throw new BadRequestException(
                    `User ${user.recordId} cannot be assigned as they do not belong to the target client.`
                );
            }
        }
    }
}