import { Module } from '@nestjs/common';
import { ClientResolverModule } from '../../clients/client-resolver/client-resolver.module';
import { VisibilityService } from './visibility.service';

@Module({
  imports: [
    ClientResolverModule,
  ],
  providers: [VisibilityService],
  exports: [VisibilityService],
})
export class VisibilityModule {}