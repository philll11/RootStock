import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseFilters, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

import { SubsidiariesService } from './subsidiaries.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';

import { ClientsService } from '../clients/clients.service';
import { QueryClientDto } from '../clients/dto/query-client.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';

import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('subsidiaries')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseFilters(MongoExceptionFilter)
export class SubsidiariesController {
  constructor(
    private readonly subsidiariesService: SubsidiariesService,
    private readonly clientsService: ClientsService,
  ) { }

  @Post()
  @Roles('Administrator')
  create(@Body() createSubsidiaryDto: CreateSubsidiaryDto) {
    return this.subsidiariesService.create(createSubsidiaryDto);
  }

  @Get()
  findAll(@Query() query: QuerySubsidiaryDto, @Req() req) {
    return this.subsidiariesService.findAll(query, req.user);
  }

  @Get(':subsidiaryId')
  findOne(@Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string, @Req() req) {
    return this.subsidiariesService.findOne(subsidiaryId, req.user);
  }

  @Get(':subsidiaryId/clients')
  async findAllClientsForSubsidiary(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Query() query: QueryClientDto,
    @Req() req,
  ) {
    // First, ensure the user has permission to see the parent subsidiary.
    await this.subsidiariesService.findOne(subsidiaryId, req.user);

    // Then, list the clients using the already-refactored, secure method.
    return this.clientsService.findAllBySubsidiaryId(subsidiaryId, query, req.user);
  }

  @Patch(':subsidiaryId')
  update(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Body() updateSubsidiaryDto: UpdateSubsidiaryDto,
    @Req() req,
  ) {
    return this.subsidiariesService.update(subsidiaryId, updateSubsidiaryDto, req.user);
  }

  @Delete(':subsidiaryId')
  @Roles('Administrator')
  remove(@Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string, @Req() req) {
    return this.subsidiariesService.remove(subsidiaryId, req.user);
  }
}