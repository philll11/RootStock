// backend/src/counters/counters.module.ts
import { Module } from '@nestjs/common';
import { CountersService } from './counters.service';
import { CountersController } from './counters.controller';

@Module({
  controllers: [CountersController],
  providers: [CountersService],
  exports: [CountersService],
})
export class CountersModule { }