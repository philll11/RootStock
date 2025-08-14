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
  create(@Body() createOrchardDto: CreateOrchardDto) {
    return this.orchardsService.create(createOrchardDto);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findAll(@Query() query: QueryOrchardDto, @Req() req) {
    return this.orchardsService.findAll(query, req.user);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ORCHARD_VIEW)
  findOne(@Param('id', ParseMongoIdPipe) id: string, @Req() req) {
    return this.orchardsService.findOne(id, req.user);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ORCHARD_EDIT)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() updateOrchardDto: UpdateOrchardDto, @Req() req) {
    return this.orchardsService.update(id, updateOrchardDto, req.user);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ORCHARD_DELETE)
  remove(@Param('id', ParseMongoIdPipe) id: string, @Req() req) {
    return this.orchardsService.remove(id, req.user);
  }
}