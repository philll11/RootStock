import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from '../clients/entities/client.schema';
import { Role, RoleSchema } from '../roles/entities/role.schema';
import { Subsidiary, SubsidiarySchema } from '../subsidiaries/entities/subsidiary.schema';
import { User, UserSchema } from '../users/entities/user.schema';

@Global()
@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Client.name, schema: ClientSchema },
            { name: Role.name, schema: RoleSchema },
            { name: Subsidiary.name, schema: SubsidiarySchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    exports: [MongooseModule],
})
export class DatabaseModule { }