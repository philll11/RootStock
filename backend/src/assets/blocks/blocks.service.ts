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

import { PERMISSIONS, Resource } from '../../common/constants/permissions.constants';
import { AuditsService } from '../../system/audits/audits.service';
import { AuditAction } from '../../system/audits/schemas/audit.schema';

@Injectable()
export class BlocksService {
  constructor(
    @InjectModel(Block.name) private blockModel: Model<BlockDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => OrchardsService)) private readonly orchardsService: OrchardsService,
    @Inject(forwardRef(() => AssessmentsService)) private readonly assessmentsService: AssessmentsService,
    @Inject(forwardRef(() => AuditsService)) private readonly auditsService: AuditsService,
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
      clientId: (orchard.clientId as any)._id || orchard.clientId,
    });

    // Simple atomic save since Block has no children yet
    try {
      const savedBlock = await newBlock.save();

      // Hydrate to match findOne structure (API Standardization)
      await savedBlock.populate([
        { path: 'orchardId', select: 'name recordId' },
        { path: 'plantings.varietyId', select: 'name recordId' }
      ]);

      await this.auditsService.log(
        Resource.BLOCK,
        savedBlock._id.toString(),
        AuditAction.CREATE,
        null,
        savedBlock.toObject(),
        requestingUser._id.toString(),
        'Block Created'
      );

      return savedBlock;
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
      .populate([
        { path: 'orchardId', select: 'name recordId' },
        { path: 'plantings.varietyId', select: 'name recordId' }
      ])
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
      .populate([
        { path: 'orchardId', select: 'name recordId' },
        { path: 'plantings.varietyId', select: 'name recordId' }
      ])
      .exec();

    if (!block) {
      throw new NotFoundException(`Block with ID "${blockId}" not found or you do not have permission.`);
    }
    return block;
  }

  async update(blockId: string, updateBlockDto: UpdateBlockDto, requestingUser: UserDocument): Promise<BlockDocument> {
    const blockToUpdate = await this.findOne(blockId, requestingUser, { includeInactive: true });
    
    // Optimistic Concurrency Check (In-Memory)
    if (updateBlockDto.__v !== undefined && blockToUpdate.__v !== updateBlockDto.__v) {
      throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
    }

    // Capture original state for auditing
    const originalState = blockToUpdate.toObject();

    const { isActive, __v, ...restOfDto } = updateBlockDto;

    // System Constraint: Only roles with BLOCK_MANAGE_INACTIVE permissions can change Block status.
    if (isActive !== undefined && isActive !== blockToUpdate.isActive) {
      const userPermissions = (requestingUser.roleId as any)?.permissions || [];
      if (!userPermissions.includes(PERMISSIONS.BLOCK_MANAGE_INACTIVE)) {
        throw new ForbiddenException('You do not have permission to change the isActive status of a block.');
      }
      blockToUpdate.isActive = isActive;
    }

    // Apply standard updates
    Object.assign(blockToUpdate, restOfDto);

    try {
      blockToUpdate.increment();
      const updatedBlock = await blockToUpdate.save();

      await updatedBlock.populate([
        { path: 'orchardId', select: 'name recordId' },
        { path: 'plantings.varietyId', select: 'name recordId' }
      ]);


    const ignoredPaths = [];
    const itemIdentityMap = { 'plantings': '^varietyId.name' };
    const fieldDisplayNameMap = { 'orchardId': 'Orchard', 'plantings': 'Plantings' };
    await this.auditsService.log(
      Resource.BLOCK,
      updatedBlock._id.toString(),
      AuditAction.UPDATE,
      originalState,
      updatedBlock.toObject(),
      requestingUser._id.toString(),
      'Block Updated',
      ignoredPaths,
      itemIdentityMap,
      fieldDisplayNameMap
    );

    return updatedBlock;

    } catch (error: any) {
      if (error.versionError || error.name === 'VersionError') {
        throw new ConflictException('The record has been modified by another user. Please refresh and try again.');
      }
      throw error;
    }
  }

  async remove(blockId: string, requestingUser: UserDocument): Promise<BlockDocument> {
    // Validate access first
    const blockToDelete = await this.findOne(blockId, requestingUser);

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

      await this.auditsService.log(
        Resource.BLOCK,
        blockId,
        AuditAction.DELETE,
        blockToDelete.toObject(),
        null,
        requestingUser._id.toString(),
        'Block Deleted'
      );

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

