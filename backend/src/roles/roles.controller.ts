import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, UseFilters, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard, RolesGuard)
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
  findAll(@Query() query: QueryRoleDto, @Req() req) {
    return this.rolesService.findAll(query, req.user);
  }

  @Get(':roleId')
  findOne(@Param('roleId', ParseMongoIdPipe) roleId: string, @Req() req) {
    return this.rolesService.findOne(roleId, req.user);
  }

  @Get(':roleId/users')
  async findAllUsersForRole(
    @Param('roleId', ParseMongoIdPipe) roleId: string,
    @Query() query: QueryUserDto,
    @Req() req,
  ) {
    await this.rolesService.findOne(roleId, req.user); // Secure check
    return this.usersService.findAllByRoleId(roleId, query, req.user);
  }

  @Patch(':roleId')
  update(@Param('roleId', ParseMongoIdPipe) roleId: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req) {
    return this.rolesService.update(roleId, updateRoleDto, req.user);
  }

  @Delete(':roleId')
  remove(@Param('roleId', ParseMongoIdPipe) roleId: string, @Req() req) {
    return this.rolesService.remove(roleId, req.user);
  }
}