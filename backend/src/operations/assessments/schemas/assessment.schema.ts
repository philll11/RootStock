// backend/src/operations/assessments/schemas/assessment.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AssessmentDocument = HydratedDocument<Assessment>;

export enum AssessmentStatus {
    PENDING = 'PENDING',         // Created, no data
    IN_PROGRESS = 'IN_PROGRESS', // Has samples, not finalized
    COMPLETED = 'COMPLETED',     // Locked, report ready
}

/**
 * Embedded Schema: A single data point (e.g., one tree or one row)
 */
@Schema({ _id: false })
export class AssessmentSample {
    @Prop({ required: true })
    rowNumber: number;

    @Prop({ required: true, min: 0 })
    totalFruit: number;

    @Prop({ required: true, min: 0 })
    damagedFruit: number;
}
export const AssessmentSampleSchema = SchemaFactory.createForClass(AssessmentSample);

/**
 * Embedded Schema: The Calculated Results (Source of Truth)
 * These are derived by the backend from the samples array.
 */
@Schema({ _id: false })
export class AssessmentSummary {
    @Prop({ required: true, default: 0 })
    totalSamples: number;

    @Prop({ required: true, default: 0 })
    totalFruit: number;

    @Prop({ required: true, default: 0 })
    totalDamaged: number;

    @Prop({ required: true, default: 0 })
    averageDamagePercentage: number;
}
export const AssessmentSummarySchema = SchemaFactory.createForClass(AssessmentSummary);

/**
 * Embedded Schema: Audit Log for Completed Assessments
 * Required for Insurance/Compliance (Story C-4)
 */
@Schema({ _id: false })
export class AssessmentAuditLog {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    userId: Types.ObjectId;

    @Prop({ required: true })
    action: string; // e.g., 'UPDATE_SAMPLES', 'STATUS_CHANGE'

    @Prop({ required: true })
    reason: string; // The mandatory change reason

    @Prop({ type: AssessmentSummarySchema })
    previousSummary: AssessmentSummary; // Snapshot of stats before the change

    @Prop({ default: Date.now })
    date: Date;
}
export const AssessmentAuditLogSchema = SchemaFactory.createForClass(AssessmentAuditLog);

/**
 * Main Assessment Document
 */
@Schema({ timestamps: true })
export class Assessment {

    @Prop({ required: true, unique: true, index: true })
    recordId: string;

    // -- RELATIONSHIPS --

    @Prop({ type: Types.ObjectId, ref: 'Block', required: true, index: true })
    blockId: Types.ObjectId;

    // Denormalized for efficient Visibility Scope filtering
    @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true })
    clientId: Types.ObjectId;

    // SNAPSHOT: The variety as it existed when this assessment was created.
    @Prop({ type: Types.ObjectId, ref: 'Variety', required: true })
    varietyId: Types.ObjectId;

    // -- DATA --

    @Prop({ required: true })
    date: Date;

    @Prop({ required: true, enum: AssessmentStatus, default: AssessmentStatus.PENDING, index: true })
    status: AssessmentStatus;

    // -- EMBEDDED DATA --

    @Prop({ type: [AssessmentSampleSchema], default: [] })
    samples: AssessmentSample[];

    @Prop({ type: AssessmentSummarySchema, default: {} })
    summary: AssessmentSummary;

    @Prop({ type: [AssessmentAuditLogSchema], default: [] })
    revisionHistory: AssessmentAuditLog[];

    // -- STANDARD --

    @Prop({ required: true, default: true })
    isActive: boolean;

    @Prop({ required: true, default: false })
    isDeleted: boolean;
}

export const AssessmentSchema = SchemaFactory.createForClass(Assessment);