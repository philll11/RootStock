import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Subsidiary, SubsidiaryDocument } from './entities/subsidiary.schema';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';
import { SubsidiaryQueryBuilder } from './builders/subsidiary-query.builder';

@Injectable()
export class SubsidiariesService {
  constructor(@InjectModel(Subsidiary.name) private subsidiaryModel: Model<SubsidiaryDocument>) { }

  async create(createSubsidiaryDto: CreateSubsidiaryDto): Promise<Subsidiary> {
    const createdSubsidiary = new this.subsidiaryModel(createSubsidiaryDto);
    return createdSubsidiary.save();
  }

  async findAll(query: QuerySubsidiaryDto, loggedInUserRole: string): Promise<Subsidiary[]> {
    const queryBuilder = new SubsidiaryQueryBuilder(query, loggedInUserRole);
    const filter = queryBuilder.build();

    return this.subsidiaryModel.find(filter).exec();
  }

  async findOne(subsidiaryId: string): Promise<Subsidiary> {
    const subsidiary = await this.subsidiaryModel
      .findOne({ _id: subsidiaryId, isDeleted: false, isActive: true })
      .exec();

    if (!subsidiary) {
      throw new NotFoundException(`Active subsidiary with ID "${subsidiaryId}" not found`);
    }

    return subsidiary;
  }

  async update(
    subsidiaryId: string,
    updateSubsidiaryDto: UpdateSubsidiaryDto,
    loggedInUserRole: string,
  ): Promise<Subsidiary> {
    await this._findSubsidiaryForUpdate(subsidiaryId, loggedInUserRole);

    const updatePayload = this._prepareUpdatePayload(updateSubsidiaryDto, loggedInUserRole);

    const updatedSubsidiary = await this.subsidiaryModel
      .findByIdAndUpdate(subsidiaryId, { $set: updatePayload }, { new: true })
      .exec();

    if (!updatedSubsidiary) {
      throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" could not be updated.`);
    }

    return updatedSubsidiary;
  }

  async remove(subsidiaryId: string): Promise<Subsidiary> {
    const deletedSubsidiary = await this.subsidiaryModel
      .findByIdAndUpdate(
        subsidiaryId,
        { isDeleted: true, isActive: false },
        { new: true },
      )
      .exec();

    if (!deletedSubsidiary) {
      throw new NotFoundException(`Subsidiary with ID "${subsidiaryId}" not found`);
    }

    return deletedSubsidiary;
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
  private _prepareUpdatePayload(
    updateSubsidiaryDto: UpdateSubsidiaryDto,
    loggedInUserRole: string,
  ): Partial<Subsidiary> {
    const { isActive, ...restOfDto } = updateSubsidiaryDto;
    const updatePayload: Partial<Subsidiary> = { ...restOfDto };

    // Only admins can change the isActive status.
    if ('isActive' in updateSubsidiaryDto) {
      if (loggedInUserRole !== 'Administrator') {
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
    const count = await this.subsidiaryModel
      .countDocuments({ _id: subsidiaryId, isDeleted: false, isActive: true })
      .exec();
    return count > 0;
  }
}