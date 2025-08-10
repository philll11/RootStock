import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseGuards, UseFilters, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { QueryUserDto } from './dto/query-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard) // Apply guards globally to this controller
@UseFilters(new MongoExceptionFilter())
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles('Administrator')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: QueryUserDto, @Req() req) {
    return this.usersService.findAll(query, req.user);
  }

  @Get(':userId')
  findOne(@Param('userId', ParseMongoIdPipe) userId: string, @Req() req) {
    return this.usersService.findOne(userId, req.user);
  }

  @Patch(':userId')
  @Roles('Administrator')
  update(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req,
  ) {
    return this.usersService.update(userId, updateUserDto, req.user);
  }

  @Delete(':userId')
  @Roles('Administrator')
  remove(@Param('userId', ParseMongoIdPipe) userId: string, @Req() req) {
    return this.usersService.remove(userId, req.user);
  }
}