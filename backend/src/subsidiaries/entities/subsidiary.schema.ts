import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SubsidiaryDocument = HydratedDocument<Subsidiary>;

@Schema({ timestamps: true })
export class Subsidiary {

  @Prop({ required: true, unique: true, index: true })
  recordId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;
}

export const SubsidiarySchema = SchemaFactory.createForClass(Subsidiary);