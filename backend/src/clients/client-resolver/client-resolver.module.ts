import { Module } from '@nestjs/common';
import { ClientResolverService } from './client-resolver.service';

// Note: We do not need to import MongooseModule here because our `DatabaseModule`
// is marked as @Global and already handles the registration of the Client model.

@Module({
  providers: [ClientResolverService],
  exports: [ClientResolverService],
})
export class ClientResolverModule {}