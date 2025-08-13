import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseFilters, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';


@Controller('users')
@UseFilters(new MongoExceptionFilter())
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @RequirePermission(PERMISSIONS.USER_CREATE)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findAll(@Query() query: QueryUserDto, @Req() req) {
    return this.usersService.findAll(query, req.user);
  }

  @Get(':userId')
  @RequirePermission(PERMISSIONS.USER_VIEW)
  findOne(@Param('userId', ParseMongoIdPipe) userId: string, @Req() req) {
    return this.usersService.findOne(userId, req.user);
  }

  @Patch(':userId')
  @RequirePermission(PERMISSIONS.USER_EDIT)
  update(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req,
  ) {
    return this.usersService.update(userId, updateUserDto, req.user);
  }

  @Delete(':userId')
  @RequirePermission(PERMISSIONS.USER_DELETE)
  remove(@Param('userId', ParseMongoIdPipe) userId: string, @Req() req) {
    return this.usersService.remove(userId, req.user);
  }
}