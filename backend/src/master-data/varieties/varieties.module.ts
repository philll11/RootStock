import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VarietiesService } from './varieties.service';
import { VarietiesController } from './varieties.controller';
import { Variety, VarietySchema } from './schemas/variety.schema';
import { CountersModule } from '../../counters/counters.module';
import { ClientsModule } from '../../clients/clients.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Variety.name, schema: VarietySchema }]),
    CountersModule,
    ClientsModule,
  ],
  controllers: [VarietiesController],
  providers: [VarietiesService],
  exports: [VarietiesService],
})
export class VarietiesModule {}
