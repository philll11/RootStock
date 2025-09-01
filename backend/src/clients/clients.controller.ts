import { Controller, Get, Post, Body, Patch, Put, Param, Delete, UseFilters, Query, HttpCode, HttpStatus } from '@nestjs/common';

import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';

import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { AssignUsersDto } from './dto/assign-users.dto';

import { UsersService } from '../users/users.service';
import { QueryUserDto } from '../users/dto/query-user.dto';
import type { UserDocument } from '../users/schemas/user.schema';

import { OrchardsService } from '../orchards/orchards.service';
import { QueryOrchardDto } from '../orchards/dto/query-orchard.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

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
  create(@Body() createClientDto: CreateClientDto, @CurrentUser() user: UserDocument) {
    return this.clientsService.create(createClientDto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findAll(@Query() query: QueryClientDto, @CurrentUser() user: UserDocument) {
    return this.clientsService.findAll(query, user);
  }

  @Get(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  findOne(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryClientDto,
    @CurrentUser() user: UserDocument
  ) {
    return this.clientsService.findOne(clientId, user, { includeInactive: query.includeInactives });
  }

  @Get(':clientId/users')
  @RequirePermission(PERMISSIONS.CLIENT_VIEW)
  async findAllUsersForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryUserDto,
    @CurrentUser() user: UserDocument,
  ) {
    await this.clientsService.findOne(clientId, user);
    return this.usersService.findAllByClientId(clientId, query, user);
  }

  @Get(':clientId/orchards')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW) // Secure with Orchard permission
  async findAllOrchardsForClient(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Query() query: QueryOrchardDto,
    @CurrentUser() user: UserDocument,
  ) {
    // First, validate that the user has access to the parent client.
    await this.clientsService.findOne(clientId, user);
    // Then, fetch the orchards for that client.
    return this.orchardsService.findAllByClientId(clientId, query, user);
  }

  @Patch(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  update(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser() user: UserDocument,
  ) {
    return this.clientsService.update(clientId, updateClientDto, user);
  }

  @Put(':clientId/users')
  @RequirePermission(PERMISSIONS.CLIENT_EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async assignUsers(
    @Param('clientId', ParseMongoIdPipe) clientId: string,
    @Body() assignUsersDto: AssignUsersDto,
    @CurrentUser() user: UserDocument,
  ): Promise<void> {
    await this.clientsService.assignUsers(clientId, assignUsersDto.userIds, user);
  }

  @Delete(':clientId')
  @RequirePermission(PERMISSIONS.CLIENT_DELETE)
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string, @CurrentUser() user: UserDocument) {
    return this.clientsService.remove(clientId, user);
  }
}