import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseFilters, Query, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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
@UseGuards(JwtAuthGuard, RolesGuard)
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
  findAll(@Query() query: QueryClientDto, @Req() req) {
    return this.clientsService.findAll(query, req.user);
  }

  @Get(':clientId')
  findOne(@Param('clientId', ParseMongoIdPipe) clientId: string, @Req() req) {
    return this.clientsService.findOne(clientId, req.user);
  }

  @Get(':clientId/users')
  async findAllUsersForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryUserDto,
    @Req() req,
  ) {
    // This check is now secure because it uses the refactored, user-aware findOne method.
    await this.clientsService.findOne(clientId, req.user);
    return this.usersService.findAllByClientId(clientId, query, req.user);
  }

  @Patch(':clientId')
  update(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() updateClientDto: UpdateClientDto,
    @Req() req,
  ) {
    return this.clientsService.update(clientId, updateClientDto, req.user);
  }

  @Delete(':clientId')
  @Roles('Administrator')
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string, @Req() req) {
    return this.clientsService.remove(clientId, req.user);
  }
}
