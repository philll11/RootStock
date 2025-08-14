import { Controller, Get, Post, Body, Patch, Param, Delete, UseFilters, Query, Req } from '@nestjs/common';

import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';

import { OrchardsService } from '../orchards/orchards.service';
import { QueryOrchardDto } from '../orchards/dto/query-orchard.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';

import { PERMISSIONS } from '../common/constants/permissions.constants';

@Controller('clients')
@UseFilters(MongoExceptionFilter)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly usersService: UsersService,
    private readonly orchardsService: OrchardsService,
  ) { }

  @Post()
  @RequirePermission(PERMISSIONS.CLIENT_CREATE)
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findAll(@Query() query: QueryClientDto, @Req() req) {
    return this.clientsService.findAll(query, req.user);
  }

  @Get(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findOne(@Param('clientId', ParseMongoIdPipe) clientId: string, @Req() req) {
    return this.clientsService.findOne(clientId, req.user);
  }

  @Get(':clientId/users')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  async findAllUsersForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryUserDto,
    @Req() req,
  ) {
    await this.clientsService.findOne(clientId, req.user);
    return this.usersService.findAllByClientId(clientId, query, req.user);
  }

  @Get(':clientId/orchards')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW) // Secure with Orchard permission
  async findAllOrchardsForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryOrchardDto,
    @Req() req,
  ) {
    // First, validate that the user has access to the parent client.
    await this.clientsService.findOne(clientId, req.user);
    // Then, fetch the orchards for that client.
    return this.orchardsService.findAllByClientId(clientId, query, req.user);
  }

  @Patch(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  update(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() updateClientDto: UpdateClientDto,
    @Req() req,
  ) {
    return this.clientsService.update(clientId, updateClientDto, req.user);
  }

  @Delete(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_DELETE)
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string, @Req() req) {
    return this.clientsService.remove(clientId, req.user);
  }
}