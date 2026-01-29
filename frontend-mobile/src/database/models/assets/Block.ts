import { Model } from '@nozbe/watermelondb'
import { field, text, date, json, readonly, relation } from '@nozbe/watermelondb/decorators'
import Orchard from './Orchard'
import Client from '../iam/Client'

export default class Block extends Model {
    static table = 'blocks'
    static associations = {
        orchards: { type: 'belongs_to', key: 'orchard_id' },
        clients: { type: 'belongs_to', key: 'client_id' },
    } as const

    @text('record_id') recordId!: string
    @text('name') name!: string

    @relation('orchards', 'orchard_id') orchard!: Orchard
    @relation('clients', 'client_id') client!: Client

    // Stored as JSON to match embedded MongoDB structure
    // [{ varietyId: string, treeCount: number }]
    @json('plantings', (raw: unknown) => raw) plantings!: any[]

    @field('is_active') isActive!: boolean
    @field('is_deleted') isDeleted!: boolean

    @readonly @date('created_at') createdAt!: number
    @readonly @date('updated_at') updatedAt!: number
}
