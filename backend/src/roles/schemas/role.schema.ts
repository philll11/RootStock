import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum VisibilityScope {
    CLIENT = 'Client',
    SUBSIDIARY = 'Subsidiary',
    GLOBAL = 'Global',
}

export type RoleDocument = HydratedDocument<Role>;

@Schema({ timestamps: true })
export class Role {
    @Prop({ required: true, unique: true, index: true })
    recordId: string;

    @Prop({ required: true })
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

// Enforces name uniqueness on roles that are not deleted
RoleSchema.index({ name: 1 },{ unique: true, partialFilterExpression: { isDeleted: false } });