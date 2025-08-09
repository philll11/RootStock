import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubsidiariesService } from './subsidiaries.service';
import { SubsidiariesController } from './subsidiaries.controller';
import { Subsidiary, SubsidiarySchema } from './entities/subsidiary.schema';
import { IsExistingSubsidiaryConstraint } from './validators/is-existing-subsidiary.validator'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subsidiary.name, schema: SubsidiarySchema }
    ]),
  ],
  controllers: [SubsidiariesController],
  providers: [SubsidiariesService, IsExistingSubsidiaryConstraint],
  exports: [MongooseModule, SubsidiariesService],
})
export class SubsidiariesModule { }