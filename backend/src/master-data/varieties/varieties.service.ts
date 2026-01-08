import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Variety, VarietyDocument } from './schemas/variety.schema';
import { BlocksService } from '../../assets/blocks/blocks.service';
import { CreateVarietyDto } from './dto/create-variety.dto';
import { UpdateVarietyDto } from './dto/update-variety.dto';
import { VarietyQueryDto } from './dto/variety-query.dto';
import { CountersService } from '../../system/counters/counters.service';
import { ClientResolverService } from '../../iam/client-resolver/client-resolver.service';
import { UserDocument } from '../../iam/users/schemas/user.schema';
import { VarietyQueryBuilder } from './builders/variety-query.builder';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

@Injectable()
export class VarietiesService {
  constructor(
    @InjectModel(Variety.name) private varietyModel: Model<VarietyDocument>,
    @Inject(forwardRef(() => BlocksService)) private readonly blocksService: BlocksService,
    private readonly countersService: CountersService,
    private readonly clientResolverService: ClientResolverService,
  ) { }

  async create(createVarietyDto: CreateVarietyDto, requestingUser: UserDocument): Promise<VarietyDocument> {
    // Check for case-insensitive uniqueness
    const existingVariety = await this.varietyModel.findOne({
      name: { $regex: new RegExp(`^${createVarietyDto.name}$`, 'i') },
    }).exec();

    if (existingVariety) {
      throw new ConflictException(`Variety with name "${createVarietyDto.name}" already exists.`);
    }

    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('variety', 'VAR');
    const recordId = `${prefix}${sequence_value.toString().padStart(3, '0')}`;

    const createdVariety = new this.varietyModel({
      ...createVarietyDto,
      recordId,
    });
    return createdVariety.save();
  }

  async findAll(query: VarietyQueryDto, requestingUser: UserDocument): Promise<VarietyDocument[]> {
    const queryBuilder = new VarietyQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    return this.varietyModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<VarietyDocument> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new VarietyQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();
    filter._id = id;

    const variety = await this.varietyModel.findOne(filter).exec();
    if (!variety) {
      throw new NotFoundException(`Variety with ID "${id}" not found`);
    }
    return variety;
  }

  async update(id: string, updateVarietyDto: UpdateVarietyDto, requestingUser: UserDocument): Promise<VarietyDocument> {
    const existingEntity = await this.findOne(id, requestingUser, { includeInactive: true });

    // Optimistic Concurrency Check (In-Memory)
    if (existingEntity.__v !== updateVarietyDto.__v) {
      throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
    }

    // Check for case-insensitive uniqueness if name is being changed
    if (updateVarietyDto.name && updateVarietyDto.name !== existingEntity.name) {
      const existingVariety = await this.varietyModel.findOne({
        name: { $regex: new RegExp(`^${updateVarietyDto.name}$`, 'i') },
        _id: { $ne: id }
      }).exec();

      if (existingVariety) {
        throw new ConflictException(`Variety with name "${updateVarietyDto.name}" already exists.`);
      }
    }

    const { isActive, __v, ...restOfDto } = updateVarietyDto;
    
    // Apply basic updates
    Object.assign(existingEntity, restOfDto);

    // System Constraint: Only roles with VARIETY_MANAGE_INACTIVE permissions can change Variety status.
    if (isActive !== undefined && isActive !== existingEntity.isActive) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.VARIETY_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status of a variety.');
      }
      existingEntity.isActive = isActive;
    }

    existingEntity.increment(); // Increment version for optimistic concurrency

    try {
      return await existingEntity.save();
    } catch (error: any) {
      if (error.versionError || error.name === 'VersionError') {
         throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
      }
      throw error;
    }
  }

  async remove(varietyId: string, requestingUser: UserDocument): Promise<VarietyDocument> {
    const clientToDelete = await this.findOne(varietyId, requestingUser); // Layer 2 Client Check

    // Check if variety is used in any active Blocks before deleting
    const activeBlockCount = await this.blocksService.countActiveByVarietyId(varietyId);
    if (activeBlockCount > 0) {
      throw new ConflictException('Cannot delete Variety because it is referenced by one or more active Blocks.');
    }

    const deletedVariety = await this.varietyModel
      .findByIdAndUpdate(varietyId, { isDeleted: true, isActive: false }, { new: true })
      .exec();

    if (!deletedVariety) {
      throw new NotFoundException(`Variety with ID "${varietyId}" not found`);
    }
    return deletedVariety;
  }

  /**
   * Validates if a variety exists, is active, and is not deleted.
   * @param id The variety ID to check.
   * @returns true if valid, false otherwise.
   */
  async validateVarietyId(id: string): Promise<boolean> {
    const variety = await this.varietyModel.findOne({
      _id: id,
      isActive: true,
      isDeleted: false,
    }).exec();
    return !!variety;
  }
}
