import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly, relation, children } from '@nozbe/watermelondb/decorators'
import Subsidiary from './Subsidiary'

export default class Client extends Model {
    static table = 'clients'
    static associations = {
        subsidiaries: { type: 'belongs_to', key: 'subsidiary_id' },
        orchards: { type: 'has_many', foreignKey: 'client_id' },
    } as const

    @text('record_id') recordId!: string
    @text('name') name!: string

    @relation('subsidiaries', 'subsidiary_id') subsidiary!: Subsidiary

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    @children('orchards') orchards!: any
}
