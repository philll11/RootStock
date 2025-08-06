import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './entities/user.schema';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const createdUser = new this.userModel(createUserDto);
    return createdUser.save();
  }

  async findAll(query: QueryUserDto): Promise<User[]> {
    const filter: any = {};

    // --- Layer 1: Mandatory & Default Filters ---
    filter.isDeleted = query.isDeleted === true;
    if (!query.includeInactives) {
      filter.isActive = true;
    }

    // --- Layer 2: Optional Client-Driven Search Filters ---

    if (query.name) {
      filter.name = { $regex: query.name, $options: 'i' }; // i = Case-insensitive
    }

    if (query.userType) {
      filter.userType = query.userType;
    }

    return this.userModel.find(filter).exec();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: false }).exec();

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const existingUser = await this.userModel.findOne({ _id: id, isDeleted: false });

    if (!existingUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    const { roleId, clientId, ...restOfDto } = updateUserDto;
    const updatePayload: Partial<User> = { ...restOfDto };

    if (roleId) {
      updatePayload.roleId = new Types.ObjectId(roleId);
    }
    if (clientId) {
      updatePayload.clientId = new Types.ObjectId(clientId);
    }

    if (updatePayload.firstName || updatePayload.lastName) {
      const newFirstName = updatePayload.firstName || existingUser.firstName;
      const newLastName = updatePayload.lastName || existingUser.lastName;
      updatePayload.name = `${newFirstName} ${newLastName}`;
    }

    const updatedUser = await this.userModel.findByIdAndUpdate(
      id,
      { $set: updatePayload }, // PATCH-like operation to update only the field values found in updatePayload
      { new: true }
    ).exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID "${id}" could not be updated.`);
    }

    return updatedUser;
  }

  async remove(id: string): Promise<User> {
    const deletedUser = await this.userModel.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true },
    ).exec();

    if (!deletedUser) {
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return deletedUser;
  }
}