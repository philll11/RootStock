import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseFilters, Req } from '@nestjs/common';

import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';

import type { UserDocument } from '../users/schemas/user.schema';

@Controller('roles')
@UseFilters(new MongoExceptionFilter())
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  @RequirePermission(PERMISSIONS.ROLE_CREATE)
  create(@Body() createRoleDto: CreateRoleDto, @CurrentUser() requestingUser: UserDocument) {
    return this.rolesService.create(createRoleDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findAll(@Query() query: QueryRoleDto, @CurrentUser() requestingUser: UserDocument) {
    return this.rolesService.findAll(query, requestingUser);
  }

  @Get(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findOne(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryRoleDto,
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.rolesService.findOne(roleId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Get(':roleId/users')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  async findAllUsersForRole(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    await this.rolesService.findOne(roleId, requestingUser); // Secure check
    return this.usersService.findAllByRoleId(roleId, query, requestingUser);
  }

  @Patch(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_EDIT)
  update(@Param('roleId', ParseMongoIdPipe) roleId: string, @Body() updateRoleDto: UpdateRoleDto, @CurrentUser() requestingUser: UserDocument) {
    return this.rolesService.update(roleId, updateRoleDto, requestingUser);
  }

  @Delete(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_DELETE)
  remove(@Param('roleId', ParseMongoIdPipe) roleId: string, @CurrentUser() requestingUser: UserDocument) {
    return this.rolesService.remove(roleId, requestingUser);
  }
}