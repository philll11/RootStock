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
import { ClientResolverService } from '../clients/client-resolver/client-resolver.service';

import { User } from '../users/schemas/user.schema';
import { PERMISSIONS } from '../common/constants/permissions.constants';

@Injectable()
export class SubsidiariesService {
  constructor(
    @InjectModel(Subsidiary.name) private subsidiaryModel: Model<SubsidiaryDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectConnection() private connection: Connection,
    private readonly clientResolverService: ClientResolverService,
    private readonly clientsService: ClientsService,
  ) { }

  async create(createSubsidiaryDto: CreateSubsidiaryDto): Promise<Subsidiary> {
    return this.subsidiaryModel.create(createSubsidiaryDto);
  }

  async findAll(queryDto: QuerySubsidiaryDto, user: User): Promise<Subsidiary[]> {
    const queryBuilder = new SubsidiaryQueryBuilder(queryDto, user, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.subsidiaryModel.find(filter).exec();
  }

  async findOne(subsidiaryId: string, user: User): Promise<Subsidiary> {
    const queryBuilder = new SubsidiaryQueryBuilder({}, user, this.clientResolverService);
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

  async update(subsidiaryId: string, updateSubsidiaryDto: UpdateSubsidiaryDto, user: User): Promise<Subsidiary> {
    await this.findOne(subsidiaryId, user);

    if (updateSubsidiaryDto.isActive === false) {
      const activeClientCount = await this.clientsService.countActiveBySubsidiaryId(subsidiaryId);
      if (activeClientCount > 0) {
        throw new ConflictException(`This subsidiary cannot be deactivated because it has ${activeClientCount} active client(s) assigned to it. Please reassign or deactivate the clients first.`);
      }
    }

    const updatePayload = this._prepareUpdatePayload(updateSubsidiaryDto, user);

    const updatedSubsidiary = await this.subsidiaryModel
      .findByIdAndUpdate(subsidiaryId, { $set: updatePayload }, { new: true })
      .exec();

    if (!updatedSubsidiary) {
      throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" could not be updated.`);
    }
    return updatedSubsidiary;
  }


  async remove(subsidiaryId: string, user: User): Promise<Subsidiary> {
    await this.findOne(subsidiaryId, user);

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      await this.clientModel.updateMany({ subsidiaryId: subsidiaryId }, { $set: { subsidiaryId: null } }, { session }).exec();
      const deletedSubsidiary = await this.subsidiaryModel.findByIdAndUpdate(
        subsidiaryId,
        { isDeleted: true, isActive: false },
        { session, new: true },
      ).exec();

      if (!deletedSubsidiary) {
        throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" not found`);
      }

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
   * Prepares the final, type-safe payload for a subsidiary update operation.
   * Handles role-based field permissions.
   * @private
   */
  private _prepareUpdatePayload(updateSubsidiaryDto: UpdateSubsidiaryDto, user: User): Partial<Subsidiary> {
    const { isActive, ...restOfDto } = updateSubsidiaryDto;
    const updatePayload: Partial<Subsidiary> = { ...restOfDto };
    const userPermissions = (user.roleId as any)?.permissions || [];

    if (updateSubsidiaryDto.isActive !== undefined) {
      if (!userPermissions.includes(PERMISSIONS.SUBSIDIARY_EDIT_STATUS)) {
        throw new ForbiddenException('You do not have permission to change the isActive status.');
      }
      updatePayload.isActive = isActive;
    }
    return updatePayload;
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