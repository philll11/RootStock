// backend/src/database/database.module.ts
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Orchard, OrchardSchema } from '../orchards/schemas/orchard.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { Subsidiary, SubsidiarySchema } from '../subsidiaries/schemas/subsidiary.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Counter, CounterSchema } from '../counters/schemas/counter.schema';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Client.name, schema: ClientSchema },
            { name: Orchard.name, schema: OrchardSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Subsidiary.name, schema: SubsidiarySchema },
            { name: User.name, schema: UserSchema },
            { name: Counter.name, schema: CounterSchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }