import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document, Types } from 'mongoose';

export enum UserType {
  EMPLOYEE = 'employee',
  CLIENT = 'client',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {

  @Prop({ required: true, unique: true, index: true })
  recordId: string;

  @Prop({ required: true, index: true })
  name: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, enum: UserType })
  userType: UserType;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Role', required: false })
  roleId: Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }], required: false, default: [] })
  clientIds: Types.ObjectId[];

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);