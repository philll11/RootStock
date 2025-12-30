// backend/src/clients/clients.controller.ts

import { Controller, Get, Post, Body, Patch, Put, Param, Delete, UseFilters, Query, HttpCode, HttpStatus } from '@nestjs/common';

import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { AssignUsersDto } from './dto/assign-users.dto';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';
import type { UserDocument } from '../users/schemas/user.schema';

import { OrchardsService } from '../../assets/orchards/orchards.service';
import { QueryOrchardDto } from '../../assets/orchards/dto/query-orchard.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { PERMISSIONS } from '../../common/constants/permissions.constants';

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
  create(@Body() createClientDto: CreateClientDto, @CurrentUser() requestingUser: UserDocument) {
    return this.clientsService.create(createClientDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findAll(@Query() query: QueryClientDto, @CurrentUser() requestingUser: UserDocument) {
    return this.clientsService.findAll(query, requestingUser);
  }

  @Get(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findOne(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryClientDto,
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.clientsService.findOne(clientId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Get(':clientId/users')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  async findAllUsersForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    await this.clientsService.findOne(clientId, requestingUser);
    return this.usersService.findAllByClientId(clientId, query, requestingUser);
  }

  @Get(':clientId/orchards')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW) // Secure with Orchard permission
  async findAllOrchardsForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryOrchardDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    // First, validate that the requestingUser has access to the parent client.
    await this.clientsService.findOne(clientId, requestingUser);
    // Then, fetch the orchards for that client.
    return this.orchardsService.findAllByClientId(clientId, query, requestingUser);
  }

  @Patch(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  update(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.clientsService.update(clientId, updateClientDto, requestingUser);
  }

  @Put(':clientId/users')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() assignUsersDto: AssignUsersDto,
    @CurrentUser() requestingUser: UserDocument,
  ): Promise<void> {
    await this.clientsService.assignUsers(clientId, assignUsersDto.userIds, requestingUser);
  }

  @Delete(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_DELETE)
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string, @CurrentUser() requestingUser: UserDocument) {
    return this.clientsService.remove(clientId, requestingUser);
  }
}