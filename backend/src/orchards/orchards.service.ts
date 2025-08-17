import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { Orchard, OrchardDocument } from './schemas/orchard.schema';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { OrchardQueryBuilder } from './builders/orchards-query.builder';

import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { User } from '../users/schemas/user.schema';
import { CountersService } from '../counters/counters.service';

@Injectable()
export class OrchardsService {
    constructor(
        @InjectModel(Orchard.name) private orchardModel: Model<OrchardDocument>,
        private readonly clientResolverService: ClientResolverService,
        private readonly countersService: CountersService,
    ) { }

    async create(createOrchardDto: CreateOrchardDto): Promise<Orchard> {
        const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('orchard', 'ORC');
        const paddedSequence = sequence_value.toString().padStart(4, '0');
        const recordId = `${prefix}${paddedSequence}`;

        const { userIds, ...restOfDto } = createOrchardDto;
        const payload: Record<string, any> = { ...restOfDto, recordId };

        if (userIds) {
            payload.userIds = userIds.map(id => new Types.ObjectId(id));
        }

        const newOrchard = new this.orchardModel(payload);
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

    async findOne(id: string, user: User): Promise<Orchard> {
        const queryBuilder = new OrchardQueryBuilder({}, user, this.clientResolverService);
        const securityFilter = await queryBuilder.build();
        const finalFilter = { $and: [securityFilter, { _id: new Types.ObjectId(id) }] };

        const orchard = await this.orchardModel.findOne(finalFilter)
            .populate('clientId', 'name recordId')
            .populate('userIds', 'name recordId userType') // Populate assigned users
            .exec();
        if (!orchard) {
            throw new NotFoundException(`Orchard with ID "${id}" not found or you do not have permission to view it.`);
        }
        return orchard;
    }

    async update(id: string, updateOrchardDto: UpdateOrchardDto, user: User): Promise<Orchard> {
        await this.findOne(id, user); // Authorization check

        const { userIds, ...restOfDto } = updateOrchardDto;
        const payload: Record<string, any> = { ...restOfDto };

        if (userIds !== undefined) {
            payload.userIds = userIds.map(uid => new Types.ObjectId(uid));
        }

        const updatedOrchard = await this.orchardModel.findByIdAndUpdate(
            id,
            { $set: payload },
            { new: true },
        ).exec();

        if (!updatedOrchard) {
            throw new NotFoundException(`Orchard with ID "${id}" could not be updated.`);
        }
        return updatedOrchard;
    }

    async remove(id: string, user: User): Promise<Orchard> {
        await this.findOne(id, user); // Authorization check

        const deletedOrchard = await this.orchardModel.findByIdAndUpdate(
            id,
            { isDeleted: true, isActive: false },
            { new: true },
        ).exec();

        if (!deletedOrchard) {
            throw new NotFoundException(`Orchard with ID "${id}" not found.`);
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
}