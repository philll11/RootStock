import { Model } from '@nozbe/watermelondb'
import { field, text, date, json, readonly } from '@nozbe/watermelondb/decorators'

export default class Role extends Model {
    static table = 'roles'

    @text('record_id') recordId!: string
    @text('name') name!: string
    @text('description') description?: string
    @text('visibility_scope') visibilityScope!: string

    @json('permissions', (raw: unknown) => raw) permissions!: string[]

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number

    hasPermission(permission: string): boolean {
        return this.permissions.includes(permission)
    }
}
