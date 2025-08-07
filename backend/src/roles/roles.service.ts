import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { Role, RoleDocument } from './entities/role.schema';
import { RoleQueryBuilder } from './builders/roles-query.builder';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private roleModel: Model<RoleDocument>) { }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const createdRole = new this.roleModel(createRoleDto);
    return await createdRole.save();
  }

  async findAll(query: QueryRoleDto, loggedInUserRole: string): Promise<Role[]> {
    const queryBuilder = new RoleQueryBuilder(query, loggedInUserRole);
    const filter = queryBuilder.build();

    return await this.roleModel.find(filter).exec();
  }

  async findOne(roleId: string): Promise<Role> {
    const role = await this.roleModel.findOne({ _id: roleId, isDeleted: false, isActive: true }).exec();

    if (!role) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return role;
  }

  async update(roleId: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const existingRole = await this.roleModel.findOneAndUpdate(
      { _id: roleId, isDeleted: false, isActive: true },
      { $set: updateRoleDto },
      { new: true },
    ).exec();

    if (!existingRole) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return existingRole;
  }

  async remove(roleId: string): Promise<Role> {
    const deletedRole = await this.roleModel.findByIdAndUpdate(
      roleId,
      { isDeleted: true, isActive: false },
      { new: true },
    ).exec();

    if (!deletedRole) {
      throw new NotFoundException(`Role with ID "${roleId}" not found`);
    }
    return deletedRole;
  }

  async _isRoleExistingAndActive(roleId: string): Promise<boolean> {
    const count = await this.roleModel.countDocuments({ _id: roleId, isDeleted: false, isActive: true }).exec();
    return count > 0;
  }
}
