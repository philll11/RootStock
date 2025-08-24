import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseFilters, Req } from '@nestjs/common';

import { SubsidiariesService } from './subsidiaries.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';

import { ClientsService } from '../clients/clients.service';
import { QueryClientDto } from '../clients/dto/query-client.dto';

import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';

import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('subsidiaries')
@UseFilters(MongoExceptionFilter)
export class SubsidiariesController {
  constructor(
    private readonly subsidiariesService: SubsidiariesService,
    private readonly clientsService: ClientsService,
  ) { }

  @Post()
  @RequirePermission(PERMISSIONS.SUBSIDIARY_CREATE)
  create(@Body() createSubsidiaryDto: CreateSubsidiaryDto) {
    return this.subsidiariesService.create(createSubsidiaryDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.SUBSIDIARY_VIEW)
  findAll(@Query() query: QuerySubsidiaryDto, @Req() req) {
    return this.subsidiariesService.findAll(query, req.user);
  }

  @Get(':subsidiaryId')
  @RequirePermission(PERMISSIONS.SUBSIDIARY_VIEW)
  findOne(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Query() query: QuerySubsidiaryDto,
    @Req() req
  ) {
    return this.subsidiariesService.findOne(subsidiaryId, req.user, { includeInactive: query.includeInactives });
  }

  @Get(':subsidiaryId/clients')
  @RequirePermission(PERMISSIONS.SUBSIDIARY_VIEW)
  async findAllClientsForSubsidiary(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Query() query: QueryClientDto,
    @Req() req,
  ) {
    await this.subsidiariesService.findOne(subsidiaryId, req.user); 
    return this.clientsService.findAllBySubsidiaryId(subsidiaryId, query, req.user);
  }

  @Patch(':subsidiaryId')
  @RequirePermission(PERMISSIONS.SUBSIDIARY_EDIT)
  update(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Body() updateSubsidiaryDto: UpdateSubsidiaryDto,
    @Req() req,
  ) {
    return this.subsidiariesService.update(subsidiaryId, updateSubsidiaryDto, req.user);
  }

  @Delete(':subsidiaryId')
  @RequirePermission(PERMISSIONS.SUBSIDIARY_DELETE)
  remove(@Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string, @Req() req) {
    return this.subsidiariesService.remove(subsidiaryId, req.user);
  }
}