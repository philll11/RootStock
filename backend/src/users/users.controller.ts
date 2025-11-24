// backend/src/users/users.controller.ts
import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseFilters } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

import type { UserDocument } from '../users/schemas/user.schema';


@Controller('users')
@UseFilters(new MongoExceptionFilter())
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @RequirePermission(PERMISSIONS.USER_CREATE)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() requestingUser: UserDocument) {
    return this.usersService.create(createUserDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findAll(@Query() query: QueryUserDto, @CurrentUser() requestingUser: UserDocument) {
    return this.usersService.findAll(query, requestingUser);
  }

  @Get(':userId')
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findOne(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.usersService.findOne(userId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Patch(':userId')
  update(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.usersService.update(userId, updateUserDto, requestingUser);
  }

  @Delete(':userId')
  @RequirePermission(PERMISSIONS.USER_DELETE)
  remove(@Param('userId', ParseMongoIdPipe) userId: string, @CurrentUser() requestingUser: UserDocument) {
    return this.usersService.remove(userId, requestingUser);
  }
}