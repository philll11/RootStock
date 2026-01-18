import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type VarietyDocument = HydratedDocument<Variety>;

@Schema({ timestamps: true })
export class Variety {
  @Prop({ required: true, unique: true })
  recordId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const VarietySchema = SchemaFactory.createForClass(Variety);

// Enforces name uniqueness on varieties that are not deleted
VarietySchema.index({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 }, partialFilterExpression: { isDeleted: false } });
