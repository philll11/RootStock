import { appSchema, tableSchema } from '@nozbe/watermelondb'

export const schema = appSchema({
    version: 2,
    tables: [
        // 1. Users
        tableSchema({
            name: 'users',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'first_name', type: 'string' },
                { name: 'last_name', type: 'string' },
                { name: 'email', type: 'string', isIndexed: true },
                { name: 'user_type', type: 'string' }, // 'employee' | 'contact'
                { name: 'role_id', type: 'string', isOptional: true },
                { name: 'client_ids', type: 'string', isOptional: true }, // JSON Array
                { name: 'preferences', type: 'string', isOptional: true }, // JSON Object
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 1.1 Roles
        tableSchema({
            name: 'roles',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'description', type: 'string', isOptional: true },
                { name: 'visibility_scope', type: 'string' }, // 'Global', 'Subsidiary', 'Client'
                { name: 'permissions', type: 'string' }, // JSON Array of strings
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 2. Subsidiaries
        tableSchema({
            name: 'subsidiaries',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 3. Clients
        tableSchema({
            name: 'clients',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'subsidiary_id', type: 'string', isIndexed: true, isOptional: true },
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 4. Orchards
        tableSchema({
            name: 'orchards',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'client_id', type: 'string', isIndexed: true },
                { name: 'address', type: 'string', isOptional: true }, // JSON Object
                { name: 'user_ids', type: 'string', isOptional: true }, // JSON Array
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 5. Blocks
        tableSchema({
            name: 'blocks',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'orchard_id', type: 'string', isIndexed: true },
                { name: 'client_id', type: 'string', isIndexed: true }, // Denormalized for scope
                { name: 'plantings', type: 'string', isOptional: true }, // JSON Array of objects
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),

        // 6. Varieties (Master Data)
        tableSchema({
            name: 'varieties',
            columns: [
                { name: 'record_id', type: 'string', isIndexed: true },
                { name: 'name', type: 'string' },
                { name: 'is_active', type: 'boolean' },
                { name: 'is_deleted', type: 'boolean' },
                { name: 'created_at', type: 'number' },
                { name: 'updated_at', type: 'number' },
            ]
        }),
    ]
})
