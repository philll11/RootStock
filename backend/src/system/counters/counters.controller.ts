// backend/src/counters/counters.controller.ts
import { Controller, Get, Body, Patch, Param, UseGuards } from '@nestjs/common';
import { CountersService } from './counters.service';
import { UpdateCounterDto } from './dto/update-counter.dto';
import { RequirePermission } from '../../common/decorators/permissions.decorator';
import { PERMISSIONS } from '../../common/constants/permissions.constants';

// Note: Guards are applied globally, so they are active here by default.

@Controller('counters')
export class CountersController {
  constructor(private readonly countersService: CountersService) {}

  @Get()
  @RequirePermission(PERMISSIONS.COUNTERS_VIEW)
  findAll() {
    return this.countersService.findAll();
  }

  @Patch(':counterId')
  @RequirePermission(PERMISSIONS.COUNTERS_EDIT)
  update(@Param('counterId') counterId: string, @Body() updateCounterDto: UpdateCounterDto) {
    return this.countersService.update(counterId, updateCounterDto);
  }
}