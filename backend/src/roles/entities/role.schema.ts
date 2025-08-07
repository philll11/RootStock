import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum VisibilityScope {
    CLIENT = 'Client',
    SUBSIDIARY = 'Subsidiary',
    GLOBAL = 'Global',
}

export type RoleDocument = Role & Document;

@Schema({ timestamps: true })
export class Role {
    @Prop({ required: true, unique: true, index: true })
    recordId: string;

    @Prop({ required: true, index: true })
    name: string;

    @Prop({ required: false })
    description: string;

    @Prop({ required: true, enum: VisibilityScope })
    visibilityScope: VisibilityScope;

    // This will hold permissions like 'Client:Edit', 'User:Create'
    @Prop({ type: [String], required: true, default: [] })
    permissions: string[];

    @Prop({ required: true, default: true })
    isActive: boolean;

    @Prop({ required: true, default: false })
    isDeleted: boolean;
}

export const RoleSchema = SchemaFactory.createForClass(Role);

RoleSchema.index({ name: 1, isDeleted: 1 }, { unique: true });