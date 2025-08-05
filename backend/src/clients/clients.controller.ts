import { Controller, Get, Post, Body, Patch, Param, Delete, UseFilters } from '@nestjs/common';
import { ParseMongoIdPipe } from '../common/pipes/parse-mongo-id.pipe';
import { MongoExceptionFilter } from '../common/filters/mongo-exception.filter';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@UseFilters(MongoExceptionFilter)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) { }

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Get(':clientId')
  findOne(@Param('clientId', ParseMongoIdPipe) clientId: string) {
    return this.clientsService.findOne(clientId);
  }

  @Patch(':clientId')
  update(@Param('clientId', ParseMongoIdPipe) clientId: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(clientId, updateClientDto);
  }

  @Delete(':clientId')
  remove(@Param('clientId', ParseMongoIdPipe) clientId: string) {
    return this.clientsService.remove(clientId);
  }
}
