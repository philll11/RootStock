import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseFilters } from '@nestjs/common';
import { VarietiesService } from './varieties.service';
import { CreateVarietyDto } from './dto/create-variety.dto';
import { UpdateVarietyDto } from './dto/update-variety.dto';
import { VarietyQueryDto } from './dto/variety-query.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import type { UserDocument } from '../../iam/users/schemas/user.schema';

@Controller('varieties')
@UseFilters(new MongoExceptionFilter())
export class VarietiesController {
  constructor(private readonly varietiesService: VarietiesService) {}

  @Post()
  @RequirePermission(PERMISSIONS.VARIETY_CREATE)
  create(@Body() createVarietyDto: CreateVarietyDto, @CurrentUser() user: UserDocument) {
    return this.varietiesService.create(createVarietyDto, user);
  }

  @Get()
  @RequirePermission(PERMISSIONS.VARIETY_VIEW)
  findAll(@Query() query: VarietyQueryDto, @CurrentUser() user: UserDocument) {
    return this.varietiesService.findAll(query, user);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.VARIETY_VIEW)
  findOne(@Param('id', ParseMongoIdPipe) id: string, @CurrentUser() user: UserDocument) {
    return this.varietiesService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.VARIETY_EDIT)
  update(@Param('id', ParseMongoIdPipe) id: string, @Body() updateVarietyDto: UpdateVarietyDto, @CurrentUser() user: UserDocument) {
    return this.varietiesService.update(id, updateVarietyDto, user);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.VARIETY_DELETE)
  remove(@Param('id', ParseMongoIdPipe) id: string, @CurrentUser() user: UserDocument) {
    return this.varietiesService.remove(id, user);
  }
}
