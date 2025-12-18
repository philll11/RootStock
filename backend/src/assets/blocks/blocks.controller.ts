// backend/src/assets/blocks/blocks.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseFilters } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';
import { UpdateBlockDto } from './dto/update-block.dto';
import { QueryBlockDto } from './dto/query-block.dto';

import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ParseMongoIdPipe } from '../../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../../common/filters/mongo-exception.filter';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

import type { UserDocument } from '../../iam/users/schemas/user.schema';

@Controller('orchards/:orchardId/blocks')
@UseFilters(MongoExceptionFilter)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Post()
  @RequirePermission(PERMISSIONS.BLOCK_CREATE)
  create(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Body() createBlockDto: CreateBlockDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.blocksService.create(orchardId, createBlockDto, requestingUser);
  }

  @Get()
  @RequirePermission(PERMISSIONS.BLOCK_VIEW)
  findAll(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Query() query: QueryBlockDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.blocksService.findAll(orchardId, query, requestingUser);
  }

  @Get(':blockId')
  @RequirePermission(PERMISSIONS.BLOCK_VIEW)
  findOne(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Param('blockId', ParseMongoIdPipe) blockId: string,
    @Query() query: QueryBlockDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.blocksService.findOne(orchardId, blockId, requestingUser, { includeInactive: query.includeInactives });
  }

  @Patch(':blockId')
  @RequirePermission(PERMISSIONS.BLOCK_EDIT)
  update(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Param('blockId', ParseMongoIdPipe) blockId: string,
    @Body() updateBlockDto: UpdateBlockDto,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.blocksService.update(orchardId, blockId, updateBlockDto, requestingUser);
  }

  @Delete(':blockId')
  @RequirePermission(PERMISSIONS.BLOCK_DELETE)
  remove(
    @Param('orchardId', ParseMongoIdPipe) orchardId: string,
    @Param('blockId', ParseMongoIdPipe) blockId: string,
    @CurrentUser() requestingUser: UserDocument,
  ) {
    return this.blocksService.remove(orchardId, blockId, requestingUser);
  }
}