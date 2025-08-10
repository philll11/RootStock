import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseFilters } from '@nestjs/common';

import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { QueryRoleDto } from './dto/query-role.dto';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';

@Controller('roles')
@UseGuards(RolesGuard)
@Roles('Administrator')
@UseFilters(new MongoExceptionFilter())
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  findAll(@Query() query: QueryRoleDto/*, @CurrentUser() user: User */) {
    const fakeAdminRole = 'Administrator';
    return this.rolesService.findAll(query, fakeAdminRole);
  }

  @Get(':roleId')
  findOne(@Param('roleId', ParseMongoIdPipe) roleId: string) {
    return this.rolesService.findOne(roleId);
  }

  @Get(':roleId/users')
  async findAllUsersForRole(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryUserDto,
  ) {
    await this.rolesService.findOne(roleId); // Is Roles active check
    const fakeAdminRole = 'Administrator';
    return this.usersService.findAllByRoleId(roleId, query, fakeAdminRole);
  }

  @Patch(':roleId')
  update(@Param('roleId', ParseMongoIdPipe) roleId: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(roleId, updateRoleDto);
  }

  @Delete(':roleId')
  remove(@Param('roleId', ParseMongoIdPipe) roleId: string) {
    return this.rolesService.remove(roleId);
  }
}