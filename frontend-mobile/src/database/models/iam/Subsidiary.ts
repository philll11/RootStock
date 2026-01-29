import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly, children } from '@nozbe/watermelondb/decorators'

export default class Subsidiary extends Model {
    static table = 'subsidiaries'
    static associations = {
        clients: { type: 'has_many', foreignKey: 'subsidiary_id' },
    } as const

    @text('record_id') recordId!: string
    @text('name') name!: string
    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    @children('clients') clients!: any
}
