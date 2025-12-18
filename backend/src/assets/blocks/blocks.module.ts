// backend/src/assets/blocks/blocks.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';
import { Block, BlockSchema } from './schemas/block.schema';

import { OrchardsModule } from '../orchards/orchards.module';
import { CountersModule } from '../../system/counters/counters.module';
import { ClientResolverModule } from '../../iam/client-resolver/client-resolver.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Block.name, schema: BlockSchema }]),
    OrchardsModule,
    CountersModule,
    ClientResolverModule // Required for Scope Resolution
  ],
  controllers: [BlocksController],
  providers: [BlocksService],
  exports: [BlocksService],
})
export class BlocksModule {}
