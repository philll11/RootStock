// backend/src/subsidiaries/subsidiaries.service.ts
import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { Subsidiary, SubsidiaryDocument } from './schemas/subsidiary.schema';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';
import { SubsidiaryQueryBuilder } from './builders/subsidiary-query.builder';

import { ClientsService } from '../clients/clients.service';
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { ClientResolverService } from '../client-resolver/client-resolver.service';

import { UserDocument } from '../users/schemas/user.schema';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { CountersService } from '../../system/counters/counters.service';
import { handleConcurrentSoftDelete } from '../../common/utils/concurrent-deletion.util';

@Injectable()
export class SubsidiariesService {
  constructor(
    @InjectModel(Subsidiary.name) private subsidiaryModel: Model<SubsidiaryDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectConnection() private connection: Connection,
    private readonly clientResolverService: ClientResolverService,
    private readonly clientsService: ClientsService,
    private readonly countersService: CountersService,
  ) { }

  async create(createSubsidiaryDto: CreateSubsidiaryDto, requestingUser: UserDocument): Promise<SubsidiaryDocument> {
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('subsidiary', 'SUB');
    const paddedSequence = sequence_value.toString().padStart(4, '0');
    const recordId = `${prefix}${paddedSequence}`;

    const newSubsidiary = new this.subsidiaryModel({
      ...createSubsidiaryDto,
      recordId,
    });

    return newSubsidiary.save();
  }

  async findAll(queryDto: QuerySubsidiaryDto, requestingUser: UserDocument): Promise<SubsidiaryDocument[]> {
    const queryBuilder = new SubsidiaryQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.subsidiaryModel.find(filter).exec();
  }

  async findOne(subsidiaryId: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<Subsidiary> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new SubsidiaryQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = {
      $and: [
        securityFilter,
        { _id: new Types.ObjectId(subsidiaryId) }
      ]
    };

    const subsidiary = await this.subsidiaryModel.findOne(finalFilter).exec();

    if (!subsidiary) {
      throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" not found or you do not have permission to view it.`);
    }
    return subsidiary;
  }

  async update(subsidiaryId: string, updateSubsidiaryDto: UpdateSubsidiaryDto, requestingUser: UserDocument): Promise<SubsidiaryDocument> {
    // Layer 2 check to ensure requestingUser has permission to see the role they are trying to update.
    const existingSubsidiary = await this.findOne(subsidiaryId, requestingUser, { includeInactive: true }) as SubsidiaryDocument;

    // Optimistic Concurrency Control
    if (updateSubsidiaryDto.__v !== undefined && existingSubsidiary.__v !== undefined && updateSubsidiaryDto.__v !== existingSubsidiary.__v) {
       throw new ConflictException('Data has been modified by another user. Please refresh and try again.');
    }

    const { isActive, __v, ...restOfDto } = updateSubsidiaryDto;
    
    // Direct properties
    Object.assign(existingSubsidiary, restOfDto);
    
    if (isActive !== undefined && isActive !== existingSubsidiary.isActive) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.SUBSIDIARY_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      
      if (isActive === false) {
          const activeClientCount = await this.clientsService.countActiveBySubsidiaryId(subsidiaryId);
          if (activeClientCount > 0) {
            throw new ConflictException(`This subsidiary cannot be deactivated because it has ${activeClientCount} active client(s) assigned to it. Please reassign or deactivate the clients first.`);
          }
      }
      existingSubsidiary.isActive = isActive;
    }

    existingSubsidiary.increment();
    try {
        return await existingSubsidiary.save();
    } catch (error: any) {
        if (error.versionError || error.name === 'VersionError') {
             throw new ConflictException('Data has been modified by another user. Please refresh and try again.');
        }
        throw error;
    }
  }


  async remove(subsidiaryId: string, requestingUser: UserDocument): Promise<SubsidiaryDocument> {
    await this.findOne(subsidiaryId, requestingUser);

    const activeClients = await this.clientModel.find({ 
        subsidiaryId: new Types.ObjectId(subsidiaryId),
        isActive: true, 
        isDeleted: false 
    }).select('name recordId').exec();
    
    if (activeClients.length > 0) {
        throw new ConflictException({
            message: `Cannot delete Subsidiary. The following Clients are still attached.`,
            blockingResources: activeClients.map(c => ({
                _id: c._id,
                recordId: c.recordId,
                name: c.name
            }))
        });
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      // Handle concurrent soft deletion with transaction safety
      const deletedSubsidiary = await handleConcurrentSoftDelete<SubsidiaryDocument>(
        this.subsidiaryModel,
        subsidiaryId,
        session,
        'Subsidiary'
      );

      await session.commitTransaction();
      return deletedSubsidiary;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }


  /**
 * Checks if a subsidiary exists, is active, and is not deleted.
 * This is used by custom validators to verify relationships.
 * @param subsidiaryId - The ID of the subsidiary to check.
 * @returns A boolean indicating if the subsidiary is valid.
 */
  async isExistingAndActive(subsidiaryId: string): Promise<boolean> {
    const count = await this.subsidiaryModel.countDocuments({ _id: subsidiaryId, isDeleted: false, isActive: true }).exec();
    return count > 0;
  }
}