// backend/src/operations/assessments/assessments.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Query, UseFilters, Delete } from '@nestjs/common';
import { AssessmentsService } from './assessments.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { QueryAssessmentDto } from './dto/query-assessment.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

import type { UserDocument } from '../../iam/users/schemas/user.schema';

@Controller('assessments')
@UseFilters(MongoExceptionFilter)
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Post()
  @RequirePermission(PERMISSIONS.ASSESSMENT_CREATE)
  create(@Body() createAssessmentDto: CreateAssessmentDto, @CurrentUser() requestingUser: UserDocument) {
    return this.assessmentsService.create(createAssessmentDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.ASSESSMENT_VIEW)
  findAll(@Query() query: QueryAssessmentDto, @CurrentUser() requestingUser: UserDocument) {
    return this.assessmentsService.findAll(query, requestingUser);
  }

  @Get(':id')
  @RequirePermission(PERMISSIONS.ASSESSMENT_VIEW)
  findOne(
    @Param('id', ParseMongoIdPipe) id: string, 
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.assessmentsService.findOne(id, requestingUser);
  }

  @Patch(':id')
  @RequirePermission(PERMISSIONS.ASSESSMENT_EDIT)
  update(
    @Param('id', ParseMongoIdPipe) id: string, 
    @Body() updateAssessmentDto: UpdateAssessmentDto, 
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.assessmentsService.update(id, updateAssessmentDto, requestingUser);
  }

  @Delete(':id')
  @RequirePermission(PERMISSIONS.ASSESSMENT_DELETE)
  remove(
    @Param('id', ParseMongoIdPipe) id: string,
    @CurrentUser() requestingUser: UserDocument
  ) {
    return this.assessmentsService.remove(id, requestingUser);
  }
}