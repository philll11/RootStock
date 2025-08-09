import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { Subsidiary, SubsidiarySchema } from './entities/subsidiary.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subsidiary.name, schema: SubsidiarySchema },
    ]),
  ],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService],
  exports: [MongooseModule, SubsidiariesService],
})
export class SubsidiariesModule { }