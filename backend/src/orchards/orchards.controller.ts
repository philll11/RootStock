import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseFilters } from '@nestjs/common';
import { OrchardsService } from './orchards.service';
import { CreateOrchardDto } from './dto/create-orchard.dto';
import { UpdateOrchardDto } from './dto/update-orchard.dto';
import { QueryOrchardDto } from './dto/query-orchard.dto';
import { RequirePermission } from '../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../common/constants/permissions.constants';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';

@Controller('orchards')
@UseFilters(MongoExceptionFilter)
export class OrchardsController {
  constructor(private readonly orchardsService: OrchardsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.ORCHARD_CREATE)
  create(@Body() createOrchardDto: CreateOrchardDto, @Req() req) {
    return this.orchardsService.create(createOrchardDto, req.user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findAll(@Query() query: QueryOrchardDto, @Req() req) {
    return this.orchardsService.findAll(query, req.user);
  }

  @Get(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findOne(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Query() query: QueryOrchardDto,
    @Req() req
  ) {
    return this.orchardsService.findOne(orchardId, req.user, { includeInactive: query.includeInactives });
  }

  @Patch(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_EDIT)
  update(@Param('orchardId', ParseMongoIdPipe) orchardId: string, @Body() updateOrchardDto: UpdateOrchardDto, @Req() req) {
    return this.orchardsService.update(orchardId, updateOrchardDto, req.user);
  }

  @Delete(':orchardId')
  @RequirePermission(PERMISSIONS.ORCHARD_DELETE)
  remove(@Param('orchardId', ParseMongoIdPipe) orchardId: string, @Req() req) {
    return this.orchardsService.remove(orchardId, req.user);
  }
}