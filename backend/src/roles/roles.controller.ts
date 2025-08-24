import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseFilters, Req } from '@nestjs/common';

import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';

@Controller('roles')
@UseFilters(new MongoExceptionFilter())
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  @RequirePermission(PERMISSIONS.ROLE_CREATE)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findAll(@Query() query: QueryRoleDto, @Req() req) {
    return this.rolesService.findAll(query, req.user);
  }

  @Get(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  findOne(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryRoleDto,
    @Req() req
  ) {
    return this.rolesService.findOne(roleId, req.user, { includeInactive: query.includeInactives });
  }

  @Get(':roleId/users')
  @RequirePermission(PERMISSIONS.ROLE_VIEW)
  async findAllUsersForRole(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryUserDto,
    @Req() req,
  ) {
    await this.rolesService.findOne(roleId, req.user); // Secure check
    return this.usersService.findAllByRoleId(roleId, query, req.user);
  }

  @Patch(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_EDIT)
  update(@Param('roleId', ParseMongoIdPipe) roleId: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
    return this.rolesService.update(roleId, updateRoleDto, req.user);
  }

  @Delete(':roleId')
  @RequirePermission(PERMISSIONS.ROLE_DELETE)
  remove(@Param('roleId', ParseMongoIdPipe) roleId: string, @Req() req) {
    return this.rolesService.remove(roleId, req.user);
  }
}