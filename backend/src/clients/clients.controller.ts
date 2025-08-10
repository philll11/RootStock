import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseFilters, Query } from '@nestjs/common';

import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

@Controller('clients')
@UseGuards(RolesGuard)
@UseFilters(MongoExceptionFilter)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
  ) { }

  @Post()
  @Roles('Administrator')
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  findAll(@Query() query: QueryClientDto/*, @CurrentUser() user: User */) {
    const fakeAdminRole = 'Administrator';
    return this.clientsService.findAll(query, fakeAdminRole);
  }

  @Get(':clientId')
  findOne(@Param('clientId', ParseMongoIdPipe) clientId: string) {
    return this.clientsService.findOne(clientId);
  }

  @Get(':clientId/users')
  async findAllUsersForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryUserDto,
  ) {
    await this.clientsService.findOne(clientId); // Is Client active check

    const fakeAdminRole = 'Administrator';
    return this.usersService.findAllByClientId(clientId, query, fakeAdminRole);
  }

  @Patch(':clientId')
  update(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() updateClientDto: UpdateClientDto
    // @CurrentUser() loggedInUser: User, // This is our future goal
  ) {
    // For testing, create a fake user object that simulates a populated roleId.
    const fakeAdminoRle = 'Administrator';
    return this.clientsService.update(clientId, updateClientDto, fakeAdminoRle);
  }

  @Delete(':clientId')
  @Roles('Administrator')
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string) {
    return this.clientsService.remove(clientId);
  }
}
