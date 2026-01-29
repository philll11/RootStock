import { Model } from '@nozbe/watermelondb'
import { field, text, date, readonly } from '@nozbe/watermelondb/decorators'

export default class Variety extends Model {
    static table = 'varieties'

    @text('record_id') recordId!: string
    @text('name') name!: string

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
