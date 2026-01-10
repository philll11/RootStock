import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  REOPEN = 'REOPEN',
}

@Schema({ _id: false })
export class AuditChange {
  @Prop({ required: true })
  field: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  oldValue: any;

  @Prop({ type: MongooseSchema.Types.Mixed })
  newValue: any;
}

export const AuditChangeSchema = SchemaFactory.createForClass(AuditChange);

@Schema({ timestamps: { createdAt: 'date', updatedAt: false } })
export class AuditEntry {
  @Prop({ required: true, index: true })
  resource: string;

  @Prop({ required: true, index: true })
  resourceId: string;

  @Prop({ required: true, enum: AuditAction })
  action: AuditAction;

  @Prop({ type: [AuditChangeSchema], default: [] })
  changes: AuditChange[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ type: MongooseSchema.Types.Mixed })
  metadata: any;

  @Prop()
  date: Date;
}

export type AuditEntryDocument = HydratedDocument<AuditEntry>;
export const AuditEntrySchema = SchemaFactory.createForClass(AuditEntry);
