import { Model } from '@nozbe/watermelondb'
import { field, text, date, json, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Client from '../iam/Client'

export default class Orchard extends Model {
    static table = 'orchards'
    static associations = {
        clients: { type: 'belongs_to', key: 'client_id' },
        blocks: { type: 'has_many', foreignKey: 'orchard_id' },
    } as const

    @text('record_id') recordId!: string
    @text('name') name!: string

    @relation('clients', 'client_id') client!: Client

    @json('address', (raw: unknown) => raw) address!: any
    @json('user_ids', (raw: unknown) => raw) userIds!: string[]

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    @children('blocks') blocks!: any
}
