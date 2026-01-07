// backend/src/assets/blocks/schemas/block.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type BlockDocument = HydratedDocument<Block>;

/**
 * Embedded Schema for Plantings
 * Defined here as it is strictly a sub-document of Block
 */
@Schema()
export class Planting {
  
  @Prop({ type: Types.ObjectId, ref: 'Variety', required: true })
  varietyId: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  treeCount: number;
}

export const PlantingSchema = SchemaFactory.createForClass(Planting);

/**
 * Main Block Schema
 */
@Schema({ timestamps: true })
export class Block {

  @Prop({ required: true, unique: true, index: true })
  recordId: string;

  @Prop({ type: Types.ObjectId, ref: 'Orchard', required: true, index: true, immutable: true })
  orchardId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true, immutable: true })
  clientId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  // Replaced flat fields with the Blueprint-mandated Embedded Array
  @Prop({ type: [PlantingSchema], default: [] })
  plantings: Planting[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;
}

export const BlockSchema = SchemaFactory.createForClass(Block);

// Compound Index: Block Name must be unique within an Orchard (active records only)
BlockSchema.index({ orchardId: 1, name: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });