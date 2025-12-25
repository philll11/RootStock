// backend/src/operations/assessments/assessments.service.ts
import { BadRequestException, ConflictException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Types, Connection } from 'mongoose';

import { Assessment, AssessmentDocument, AssessmentStatus } from './schemas/assessment.schema';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { QueryAssessmentDto } from './dto/query-assessment.dto';
import { AssessmentQueryBuilder } from './builders/assessment-query.builder';
import { AssessmentCalculatorService } from './calculations/assessment-calculator.service';

import { BlocksService } from '../../assets/blocks/blocks.service';
import { CountersService } from '../../system/counters/counters.service';
import { ClientResolverService } from '../../iam/client-resolver/client-resolver.service';
import { UserDocument } from '../../iam/users/schemas/user.schema';
import { handleConcurrentSoftDelete } from '../../common/utils/concurrent-deletion.util';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => BlocksService)) private readonly blocksService: BlocksService,
    private readonly calculator: AssessmentCalculatorService,
    private readonly countersService: CountersService,
    private readonly clientResolverService: ClientResolverService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto, requestingUser: UserDocument): Promise<AssessmentDocument> {
    const { blockId, samples, date } = createAssessmentDto;

    // 1. Context Resolution (Find the block to get the orchard/client context)
    // Note: Ensure BlocksService has the 'findByIdInternal' method we discussed
    const blockContext = await this.blocksService.findByIdInternal(blockId);
    
    // 2. Permission Check (Layer 2)
    // Verify the user actually has access to this block
    await this.blocksService.findOne(blockId, requestingUser);

    // 3. Snapshot Pattern (Critical Business Rule)
    if (!blockContext.plantings || blockContext.plantings.length === 0) {
        throw new BadRequestException('Cannot create assessment for a block with no plantings.');
    }
    const snapshotVarietyId = blockContext.plantings[0].varietyId;

    // 4. ID Generation
    const { prefix, sequence_value } = await this.countersService.getNextSequenceValue('assessment', 'ASM');
    const recordId = `${prefix}${sequence_value.toString().padStart(4, '0')}`;

    // 5. Default Status Logic
    const initialStatus = (samples && samples.length > 0) ? AssessmentStatus.IN_PROGRESS : AssessmentStatus.PENDING;

    // 6. Source of Truth Calculation
    const summary = this.calculator.calculateStats(samples || []);

    const newAssessment = new this.assessmentModel({
      recordId,
      blockId: new Types.ObjectId(blockId),
      clientId: blockContext.clientId, // Inherit Scope from Block
      varietyId: snapshotVarietyId,    // Immutable Snapshot
      date,
      status: initialStatus,
      samples: samples || [],
      summary,
    });

    return newAssessment.save();
  }

  async findOne(assessmentId: string, requestingUser: UserDocument): Promise<AssessmentDocument> {
    const queryBuilder = new AssessmentQueryBuilder({}, requestingUser, this.clientResolverService);
    const securityFilter = await queryBuilder.build();

    const finalFilter = { $and: [securityFilter, { _id: new Types.ObjectId(assessmentId) }] };

    const assessment = await this.assessmentModel.findOne(finalFilter)
        .populate('blockId', 'name recordId')
        .populate('varietyId', 'name')
        .exec();

    if (!assessment) {
        throw new NotFoundException(`Assessment #${assessmentId} not found.`);
    }
    return assessment;
  }

  async findAll(query: QueryAssessmentDto, requestingUser: UserDocument): Promise<AssessmentDocument[]> {
    const queryBuilder = new AssessmentQueryBuilder(query, requestingUser, this.clientResolverService);
    const filter = await queryBuilder.build();

    return this.assessmentModel.find(filter)
        .populate('blockId', 'name recordId')
        .sort({ date: -1 })
        .exec();
  }

  async update(assessmentId: string, updateDto: UpdateAssessmentDto, requestingUser: UserDocument): Promise<AssessmentDocument> {
    const existing = await this.findOne(assessmentId, requestingUser);

    // 1. Optimistic Concurrency Control (OCC)
    if (updateDto.__v !== undefined && existing['__v'] !== updateDto.__v) {
        throw new ConflictException('The record has been modified by another user. Please refresh.');
    }

    // 2. Audit & Locking Logic
    if (existing.status === AssessmentStatus.COMPLETED) {
        if (!updateDto.changeReason) {
            throw new BadRequestException('A changeReason is mandatory when modifying a Completed assessment.');
        }

        existing.revisionHistory.push({
            userId: requestingUser._id,
            action: 'UPDATE', 
            reason: updateDto.changeReason,
            previousSummary: { ...existing.summary }, 
            date: new Date(),
        });
    }

    // 3. Apply Updates & Re-Calculate
    if (updateDto.status) {
        if (updateDto.status === AssessmentStatus.COMPLETED) {
            const currentSampleCount = updateDto.samples ? updateDto.samples.length : existing.samples.length;
            if (currentSampleCount === 0) {
                throw new BadRequestException('Cannot mark assessment as Completed with no samples.');
            }
        }
        existing.status = updateDto.status;
    }

    if (updateDto.date) {
        existing.date = updateDto.date;
    }

    if (updateDto.samples) {
        existing.samples = updateDto.samples;
        
        // Re-calculate Source of Truth
        existing.summary = this.calculator.calculateStats(updateDto.samples);
        
        // Auto-Transition
        if (existing.status === AssessmentStatus.PENDING && existing.samples.length > 0) {
             existing.status = AssessmentStatus.IN_PROGRESS;
        }
    }

    if (updateDto.isActive !== undefined) existing.isActive = updateDto.isActive;

    return existing.save();
  }

  async remove(assessmentId: string, requestingUser: UserDocument): Promise<AssessmentDocument> {
    await this.findOne(assessmentId, requestingUser); // Layer 2 Check

    const session = await this.connection.startSession();
    session.startTransaction();
    try {
        const deletedAssessment = await handleConcurrentSoftDelete<AssessmentDocument>(
            this.assessmentModel, 
            assessmentId, 
            session, 
            "Assessment"
        );
        
        await session.commitTransaction();
        return deletedAssessment;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
  }

  async checkActiveAssessmentsForBlock(blockId: string): Promise<boolean> {
    const count = await this.assessmentModel.countDocuments({
      blockId: new Types.ObjectId(blockId),
      status: { $in: [AssessmentStatus.PENDING, AssessmentStatus.IN_PROGRESS] }
    }).exec();
    return count > 0;
  }
}