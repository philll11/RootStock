import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CounterDocument = HydratedDocument<Counter>;

@Schema({ collection: 'counters' })
export class Counter {
  @Prop({ required: true })
  _id: string; // The name of the resource collection, e.g., 'subsidiary'

  @Prop({ required: true })
  prefix: string; // The business key prefix, e.g., 'SUB'

  @Prop({ required: true, default: 0 })
  sequence_value: number; // The current sequence number
}

export const CounterSchema = SchemaFactory.createForClass(Counter);