// backend/src/orchards/orchards.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseFilters } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';

import type { UserDocument } from '../../iam/users/schemas/user.schema';

@Controller('orchards')
@UseFilters(MongoExceptionFilter)
export class OrchardsController {
  constructor(private readonly orchardsService: OrchardsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.ORCHARD_CREATE)
  create(@Body() createOrchardDto: CreateOrchardDto, @CurrentUser() requestingUser: UserDocument) {
    return this.orchardsService.create(createOrchardDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findAll(@Query() query: QueryOrchardDto, @CurrentUser() requestingUser: UserDocument) {
    return this.orchardsService.findAll(query, requestingUser);
  }

  @Get(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findOne(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Query() query: QueryOrchardDto,
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.orchardsService.findOne(orchardId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Patch(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_EDIT)
  update(@Param('orchardId', ParseMongoIdPipe) orchardId: string, @Body() updateOrchardDto: UpdateOrchardDto, @CurrentUser() requestingUser: UserDocument) {
    return this.orchardsService.update(orchardId, updateOrchardDto, requestingUser);
  }

  @Delete(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_DELETE)
  remove(@Param('orchardId', ParseMongoIdPipe) orchardId: string, @CurrentUser() requestingUser: UserDocument) {
    return this.orchardsService.remove(orchardId, requestingUser);
  }
}