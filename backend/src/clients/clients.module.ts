import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { SubsidiariesModule } from '../subsidiaries/subsidiaries.module';
import { IsExistingClientsConstraint } from "./validators/is-existing-clients.validator";

@Module({
  imports: [SubsidiariesModule],
  controllers: [ClientsController],
  providers: [ClientsService, IsExistingClientsConstraint],
  exports: [ClientsService],
})
export class ClientsModule {}