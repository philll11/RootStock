// backend/src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export enum UserType {
  EMPLOYEE = 'employee',
  CONTACT = 'contact',
}

@Schema({ _id: false })
export class UserPreferences {
  @Prop({ required: true, enum: ['light', 'dark', 'auto'], default: 'auto' })
  theme: 'light' | 'dark' | 'auto';
}

export type UserDocument = HydratedDocument<User>;

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

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email: string;

  @Prop({ required: false, select: false }) // Not required for now to support existing users, but select: false hides it by default
  password?: string;

  @Prop({ required: false, select: false })
  passwordResetToken?: string;

  @Prop({ required: false, select: false })
  passwordResetExpires?: Date;

  @Prop({ required: true, enum: UserType, immutable: true })
  userType: UserType;

  @Prop({ type: Types.ObjectId, ref: 'Role', required: false })
  roleId: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Client' }], required: false, default: [] })
  clientIds: Types.ObjectId[];

  @Prop({ type: UserPreferences, default: () => ({ theme: 'auto' }) })
  preferences: UserPreferences;

  @Prop({ required: true, default: true })
  isActive: boolean;

  @Prop({ required: true, default: false })
  isDeleted: boolean;

  // Access token versioning for logout and token invalidation
  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);