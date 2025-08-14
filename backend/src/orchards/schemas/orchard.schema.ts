import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

@Schema({ timestamps: true })
class Address {
    @Prop({ type: String, trim: true })
    street: string;

    @Prop({ type: String, trim: true })
    city: string;

    @Prop({ type: String, trim: true })
    state: string;

    @Prop({ type: String, trim: true })
    postalCode: string;

    @Prop({ type: String, trim: true })
    country: string;
}

export const AddressSchema = SchemaFactory.createForClass(Address);

export type OrchardDocument = HydratedDocument<Orchard>;

@Schema({ timestamps: true })
export class Orchard {

    @Prop({ required: true, unique: true, index: true })
    recordId: string;

    @Prop({ type: String, required: true, trim: true })
    name: string;

    @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true })
    clientId: Types.ObjectId;

    @Prop({ type: AddressSchema, default: {} })
    address: Address;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    userIds: Types.ObjectId[];

    @Prop({ type: Boolean, default: true })
    isActive: boolean;

    @Prop({ type: Boolean, default: false })
    isDeleted: boolean;
}

export const OrchardSchema = SchemaFactory.createForClass(Orchard);