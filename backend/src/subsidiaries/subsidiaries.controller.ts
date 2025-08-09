import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, UseFilters } from '@nestjs/common';
import { SubsidiariesService } from './subsidiaries.service';
import { CreateSubsidiaryDto } from './dto/create-subsidiary.dto';
import { UpdateSubsidiaryDto } from './dto/update-subsidiary.dto';
import { QuerySubsidiaryDto } from './dto/query-subsidiary.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';

@Controller('subsidiaries')
@UseGuards(RolesGuard)
@UseFilters(MongoExceptionFilter)
export class SubsidiariesController {
  constructor(private readonly subsidiariesService: SubsidiariesService) { }

  @Post()
  @Roles('Administrator')
  create(@Body() createSubsidiaryDto: CreateSubsidiaryDto) {
    return this.subsidiariesService.create(createSubsidiaryDto);
  }

  @Get()
  findAll(@Query() query: QuerySubsidiaryDto) {
    // Using a placeholder for the logged-in user's role, as per existing patterns.
    const fakeAdminRole = 'Administrator';
    return this.subsidiariesService.findAll(query, fakeAdminRole);
  }

  @Get(':subsidiaryId')
  findOne(@Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string) {
    return this.subsidiariesService.findOne(subsidiaryId);
  }

  @Patch(':subsidiaryId')
  update(
    @Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string,
    @Body() updateSubsidiaryDto: UpdateSubsidiaryDto,
  ) {
    // Using a placeholder for the logged-in user's role.
    const fakeAdminRole = 'Administrator';
    return this.subsidiariesService.update(subsidiaryId, updateSubsidiaryDto, fakeAdminRole);
  }

  @Delete(':subsidiaryId')
  @Roles('Administrator')
  remove(@Param('subsidiaryId', ParseMongoIdPipe) subsidiaryId: string) {
    return this.subsidiariesService.remove(subsidiaryId);
  }
}