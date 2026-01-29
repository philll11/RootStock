import { Model } from '@nozbe/watermelondb'
import { field, text, date, json, readonly, immutableRelation } from '@nozbe/watermelondb/decorators'
import Role from './Role'

export default class User extends Model {
    static table = 'users'

    @text('record_id') recordId!: string
    @text('name') name!: string
    @text('first_name') firstName!: string
    @text('last_name') lastName!: string
    @text('email') email!: string
    @text('user_type') userType!: string
    @text('role_id') roleId!: string

    @immutableRelation('roles', 'role_id') role!: Role

    @json('client_ids', (raw: unknown) => raw) clientIds!: string[]
    @json('preferences', (raw: unknown) => raw) preferences!: any

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
