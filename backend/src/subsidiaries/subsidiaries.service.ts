import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';

import { Subsidiary, SubsidiaryDocument } from './schemas/subsidiary.schema';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';
import { SubsidiaryQueryBuilder } from './builders/subsidiary-query.builder';

import { ClientsService } from '../clients/clients.service'; 
import { Client, ClientDocument } from '../clients/schemas/client.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SubsidiariesService {
  constructor(
    @InjectModel(Subsidiary.name) private subsidiaryModel: Model<SubsidiaryDocument>,
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    @InjectConnection() private connection: Connection,
    private readonly clientsService: ClientsService, 
  ) { }

  async create(createSubsidiaryDto: CreateSubsidiaryDto): Promise<Subsidiary> {
    const createdSubsidiary = new this.subsidiaryModel(createSubsidiaryDto);
    return createdSubsidiary.save();
  }

  async findAll(queryDto: QuerySubsidiaryDto, user: User): Promise<Subsidiary[]> {
    const queryBuilder = new SubsidiaryQueryBuilder(queryDto, user, this.clientModel);
    const filter = await queryBuilder.build();
    return this.subsidiaryModel.find(filter).exec();
  }

  async findOne(subsidiaryId: string, user: User): Promise<Subsidiary> {
    const queryBuilder = new SubsidiaryQueryBuilder({}, user, this.clientModel);
    const filter = await queryBuilder.build();
    filter._id = subsidiaryId;

    const subsidiary = await this.subsidiaryModel.findOne(filter).exec();

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
   * Finds a subsidiary for an update operation, applying role-based permissions.
   * Throws a NotFoundException if the subsidiary doesn't exist or permissions fail.
   * @private
   */
  private async _findSubsidiaryForUpdate(
    subsidiaryId: string,
    loggedInUserRole: string,
  ): Promise<SubsidiaryDocument> {
    const queryCondition: any = {
      _id: subsidiaryId,
      isDeleted: false,
    };

    // Only admins can view/edit inactive records.
    if (loggedInUserRole !== 'Administrator') {
      queryCondition.isActive = true;
    }

    const subsidiary = await this.subsidiaryModel.findOne(queryCondition).exec();

    if (!subsidiary) {
      throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" not found.`);
    }
    return subsidiary;
  }

  /**
   * Prepares the final, type-safe payload for a subsidiary update operation.
   * Handles role-based field permissions.
   * @private
   */
  private _prepareUpdatePayload(updateSubsidiaryDto: UpdateSubsidiaryDto, user: User): Partial<Subsidiary> {
    const { isActive, ...restOfDto } = updateSubsidiaryDto;
    const updatePayload: Partial<Subsidiary> = { ...restOfDto };
    const userRoleName = (user.roleId as any)?.name;

    if ('isActive' in updateSubsidiaryDto) {
      if (userRoleName !== 'Administrator') {
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