import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'

import { schema } from './schema'
import User from './models/iam/User'
import Role from './models/iam/Role'
import Subsidiary from './models/iam/Subsidiary'
import Client from './models/iam/Client'
import Orchard from './models/assets/Orchard'
import Block from './models/assets/Block'
import Variety from './models/master-data/Variety'

console.log('[Database] Initializing SQLiteAdapter...');

const adapter = new SQLiteAdapter({
    schema,
    // (You might want to implement migration logic later)
    // migrations,
    jsi: true, // JSI is disabled in app.json due to RN 0.81+ New Arch incompatibility
    onSetUpError: error => {
        // Database failed to load -- offer the user to reload the app or log out
        console.error('[Database] Failed to load', error)
    }
})

console.log('[Database] Adapter initialized');

export const database = new Database({
    adapter,
    modelClasses: [
        User,
        Role,
        Subsidiary,
        Client,
        Orchard,
        Block,
        Variety,
    ],
})
