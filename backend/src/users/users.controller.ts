import { Controller, Get, Query, Post, Body, Patch, Param, Delete, UseGuards, UseFilters } from '@nestjs/common';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('users')
@UseGuards(RolesGuard)
@UseFilters(new MongoExceptionFilter())
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @Roles('Administrator')
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(@Query() query: QueryUserDto/*, @CurrentUser() user: User */) {
    const fakeAdminRole = 'Administrator';
    return this.usersService.findAll(query, fakeAdminRole);
  }

  @Get(':userId')
  findOne(@Param('userId', ParseMongoIdPipe) userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch(':userId')
  update(
    @Param('userId', ParseMongoIdPipe) userId: string,
    @Body() updateUserDto: UpdateUserDto,
    // @CurrentUser() loggedInUser: User, // This is our future goal
  ) {
    // For testing, create a fake user object that simulates a populated roleId.
    const fakeAdminoRle = 'Grower';
    return this.usersService.update(userId, updateUserDto, fakeAdminoRle);
  }

  @Delete(':userId')
  @Roles('Administrator')
  remove(@Param('userId', ParseMongoIdPipe) userId: string) {
    return this.usersService.remove(userId);
  }
}