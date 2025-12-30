// backend/src/assets/blocks/blocks.service.ts
import { ConflictException, ForbiddenException, forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';

import { handleConcurrentSoftDelete } from '../../common/utils/concurrent-deletion.util';

import { Block, BlockDocument } from './schemas/block.schema';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { QueryBlockDto } from './dto/query-block.dto';
import { BlockQueryBuilder } from './builders/block-query.builder';

import { OrchardsService } from '../orchards/orchards.service';
import { CountersService } from '../../system/counters/counters.service';
import { ClientResolverService } from '../../iam/client-resolver/client-resolver.service';
import { UserDocument } from '../../iam/users/schemas/user.schema';
import { AssessmentsService } from '../../operations/assessments/assessments.service';
import { AssessmentStatus } from '../../operations/assessments/schemas/assessment.schema';

import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { log } from 'console';

@Injectable()
export class BlocksService {
  constructor(
    @InjectModel(Block.name) private blockModel: Model<BlockDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => OrchardsService)) private readonly orchardsService: OrchardsService,
    @Inject(forwardRef(() => AssessmentsService)) private readonly assessmentsService: AssessmentsService,
    private readonly countersService: CountersService,
    private readonly clientResolverService: ClientResolverService,
  ) { }

  async create(createBlockDto: CreateBlockDto, requestingUser: UserDocument): Promise<BlockDocument> {

    const orchardId = createBlockDto.orchardId;

    // Layer 2 Check: Verify parent Orchard access
    const orchard = await this.orchardsService.findOne(orchardId, requestingUser);

    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('block', 'BLK');
    const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

    const newBlock = new this.blockModel({
      ...createBlockDto,
      recordId,
      orchardId: new Types.ObjectId(orchardId),
      clientId: orchard.clientId,
    });

    // Simple atomic save since Block has no children yet
    try {
      return await newBlock.save();
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Block name already exists in this orchard.');
      }
      throw error;
    }
  }

  async findAll(query: QueryBlockDto, requestingUser: UserDocument): Promise<BlockDocument[]> {
    const queryBuilder = new BlockQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();

    return this.blockModel.find(filter)
      .populate('orchardId', 'name')
      .populate('plantings.varietyId', 'name') // Populate embedded reference
      .exec();
  }

  async findOne(blockId: string, requestingUser: UserDocument, options: { includeInactive?: boolean } = {}): Promise<BlockDocument> {
    const queryDto = options.includeInactive ? { includeInactives: true } : {};
    const queryBuilder = new BlockQueryBuilder(queryDto, requestingUser, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    // Combine security scope + specific resource ID
    const finalFilter = {
      $and: [
        securityFilter,
        { _id: new Types.ObjectId(blockId) }
      ]
    };

    const block = await this.blockModel.findOne(finalFilter)
      .populate('orchardId', 'name')
      .populate('plantings.varietyId', 'name')
      .exec();

    if (!block) {
      throw new NotFoundException(`Block with ID "${blockId}" not found or you do not have permission.`);
    }
    return block;
  }

  async update(blockId: string, updateBlockDto: UpdateBlockDto, requestingUser: UserDocument): Promise<BlockDocument> {
    await this.findOne(blockId, requestingUser, { includeInactive: true });

    const { isActive, __v, ...restOfDto } = updateBlockDto;
    const updatePayload: any = { ...restOfDto };


    // System Constraint: Only roles with BLOCK_MANAGE_INACTIVE permissions can change Block status.
    if (updateBlockDto.isActive !== undefined) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.BLOCK_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status of a block.');
      }
      updatePayload.isActive = updateBlockDto.isActive;
    }

    const updatedBlock = await this.blockModel.findOneAndUpdate(
      { _id: blockId, __v: updateBlockDto.__v },
      { $set: updatePayload, $inc: { __v: 1 } },
      { new: true } // Return the updated doc
    ).populate('plantings.varietyId', 'name').exec();

    if (!updatedBlock) {
      throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
    }

    return updatedBlock;
  }

  async remove(blockId: string, requestingUser: UserDocument): Promise<BlockDocument> {
    // Validate access first
    await this.findOne(blockId, requestingUser);

    // Check for active assessments
    const hasActiveAssessments = await this.assessmentsService.checkActiveAssessmentsForBlock(blockId);
    if (hasActiveAssessments) {
      throw new ConflictException('Cannot delete block with active assessments.');
    }

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const deletedBlock = await handleConcurrentSoftDelete<BlockDocument>(
        this.blockModel,
        blockId,
        session,
        "Block"
      );

      await session.commitTransaction();
      return deletedBlock;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * Internal helper to fetch a block by ID to establish context (e.g., finding the parent Orchard).
   * strictly for internal service usage where the parent ID is unknown.
   */
  async findByIdInternal(blockId: string): Promise<BlockDocument> {
    const block = await this.blockModel.findById(blockId).exec();
    if (!block) throw new NotFoundException('Block not found');
    return block;
  }

  /**
   * Counts active blocks for a specific orchard.
   * Used by OrchardsService to prevent deleting parents with active children.
   */
  async countActiveByOrchardId(orchardId: string): Promise<number> {
    return this.blockModel.countDocuments({
      orchardId: new Types.ObjectId(orchardId),
      isActive: true,
      isDeleted: false
    }).exec();
  }

  /**
   * Counts active blocks for a specific variety.
   * Used by VarietiesService to prevent deleting varieties that are in use.
   */
  async countActiveByVarietyId(varietyId: string): Promise<number> {
    return this.blockModel.countDocuments({
      'plantings.varietyId': new Types.ObjectId(varietyId),
      isActive: true,
      isDeleted: false
    }).exec();
  }
}

