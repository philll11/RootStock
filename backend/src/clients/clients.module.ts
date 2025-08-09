import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client, ClientSchema } from './entities/client.schema';
import { SubsidiariesModule } from '../subsidiaries/subsidiaries.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
    SubsidiariesModule
  ],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [MongooseModule, ClientsService],
})
export class ClientsModule {}