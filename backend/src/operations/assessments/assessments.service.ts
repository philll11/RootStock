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
import { AuditsService } from '../../system/audits/audits.service';
import { AuditAction } from '../../system/audits/schemas/audit.schema';
import { Resource } from '../../common/constants/permissions.constants';

@Injectable()
export class AssessmentsService {
  constructor(
    @InjectModel(Assessment.name) private assessmentModel: Model<AssessmentDocument>,
    @InjectConnection() private connection: Connection,
    @Inject(forwardRef(() => BlocksService)) private readonly blocksService: BlocksService,
    @Inject(forwardRef(() => AuditsService)) private readonly auditsService: AuditsService,
    private readonly calculator: AssessmentCalculatorService,
    private readonly countersService: CountersService,
    private readonly clientResolverService: ClientResolverService,
  ) {}

  async create(createAssessmentDto: CreateAssessmentDto, requestingUser: UserDocument): Promise<AssessmentDocument> {
    const { blockId, samples, date, name, type } = createAssessmentDto;

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

    // 6. Data Sanitization & Calculation
    // Enforce sequential row numbers (Backend Source of Truth)
    const sanitizedSamples = this.calculator.reindexSamples(samples || []);
    const summary = this.calculator.calculateStats(sanitizedSamples);

    const newAssessment = new this.assessmentModel({
      recordId,
      name,
      type,
      blockId: new Types.ObjectId(blockId),
      clientId: blockContext.clientId, // Inherit Scope from Block
      varietyId: snapshotVarietyId,    // Immutable Snapshot
      date,
      status: initialStatus,
      samples: sanitizedSamples,
      summary,
    });

    const savedDoc = await newAssessment.save();

    await this.auditsService.log(
      Resource.ASSESSMENT,
      savedDoc._id.toString(),
      AuditAction.CREATE,
      null,
      savedDoc.toObject(),
      requestingUser._id.toString(),
      'Assessment Created'
    );

    return savedDoc;
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

    // 1. Determine Expected Version
    const updateOps: any = { $set: {}, $push: {}, $inc: {} };
    let hasChanges = false;

    // 1. Compliance Check (The Lock)
    if (existing.status === AssessmentStatus.COMPLETED) {
        // If trying to change anything OTHER than status back to IN_PROGRESS
        if (updateDto.status !== AssessmentStatus.IN_PROGRESS) {
             throw new BadRequestException('Completed assessments are locked. You must reopen the assessment (set status to IN_PROGRESS) to make changes.');
        }
        // If Reopening, ensure reason exists
        if (!updateDto.changeReason) {
            throw new BadRequestException('A changeReason is mandatory when reopening a Completed assessment.');
        }
    }

    // 3. Calculate New State
    let newStatus = updateDto.status || existing.status;

    if (updateDto.samples) {
        // Enforce sequential row numbers (Backend Source of Truth)
        const sanitizedSamples = this.calculator.reindexSamples(updateDto.samples);
        const newSummary = this.calculator.calculateStats(sanitizedSamples);
        
        updateOps.$set.samples = sanitizedSamples;
        updateOps.$set.summary = newSummary;
        
        // Auto-Transition
        if (existing.status === AssessmentStatus.PENDING && sanitizedSamples.length > 0) {
             newStatus = AssessmentStatus.IN_PROGRESS;
        }
        hasChanges = true;
    }

    // Validate Completion
    if (newStatus === AssessmentStatus.COMPLETED) {
        const currentSampleCount = updateDto.samples ? updateDto.samples.length : existing.samples.length;
        if (currentSampleCount === 0) {
            throw new BadRequestException('Cannot mark assessment as Completed with no samples.');
        }
    }

    // Apply Status Change
    if (newStatus !== existing.status) {
        updateOps.$set.status = newStatus;
        hasChanges = true;
    }

    if (updateDto.name) {
        updateOps.$set.name = updateDto.name;
        hasChanges = true;
    }

    if (updateDto.type) {
        updateOps.$set.type = updateDto.type;
        hasChanges = true;
    }

    if (updateDto.date) {
        updateOps.$set.date = updateDto.date;
        hasChanges = true;
    }

    if (updateDto.isActive !== undefined) {
        updateOps.$set.isActive = updateDto.isActive;
        hasChanges = true;
    }

    // 6. Execute Atomic Update
    if (!hasChanges) return existing;

    updateOps.$inc.__v = 1;

    // OCC Check
    if (updateDto.__v !== undefined && updateDto.__v !== existing.__v) {
        throw new ConflictException('Data has been modified by another user. Please refresh and try again.');
    }

    const updatedAssessment = await this.assessmentModel.findOneAndUpdate(
        { _id: assessmentId, __v: existing.__v },
        updateOps,
        { new: true }
    ).exec();

    if (!updatedAssessment) {
         throw new ConflictException('Data has been modified by another user. Please refresh and try again.');
    }

    // 7. Log Audit
    await this.auditsService.log(
        Resource.ASSESSMENT,
        updatedAssessment._id.toString(),
        AuditAction.UPDATE,
        existing.toObject(),
        updatedAssessment.toObject(),
        requestingUser._id.toString(),
        updateDto.changeReason || 'Assessment Updated'
    );

    return updatedAssessment;
  }

  async remove(assessmentId: string, requestingUser: UserDocument): Promise<AssessmentDocument> {
    const existing = await this.findOne(assessmentId, requestingUser); // Layer 2 Check & Snapshot

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

        await this.auditsService.log(
            Resource.ASSESSMENT,
            assessmentId,
            AuditAction.DELETE,
            existing.toObject(),
            null,
            requestingUser._id.toString(),
            'Assessment Deleted'
        );

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