import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema({ timestamps: true })
export class Client {

  @Prop({ required: true, unique: true, index: true })
  recordId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Subsidiary', required: true })
  subsidiaryId: mongoose.Schema.Types.ObjectId;
}

export const ClientSchema = SchemaFactory.createForClass(Client);