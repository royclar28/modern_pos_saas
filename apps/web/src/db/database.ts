import { createRxDatabase, RxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { itemSchema, type ItemDocType } from './schemas/item.schema';
import { saleSchema, type SaleDocType } from './schemas/sale.schema';
import { customerSchema, type CustomerDocType } from './schemas/customer.schema';
import { RxCollection } from 'rxdb';

// Enable dev mode for clearer error messages during development
addRxPlugin(RxDBDevModePlugin);

// Enable migrations so RxDB can handle schema bumps (e.g., v0 -> v1)
import { RxDBMigrationSchemaPlugin } from 'rxdb/plugins/migration-schema';
addRxPlugin(RxDBMigrationSchemaPlugin);

export type DatabaseCollections = {
    items: RxCollection<ItemDocType>;
    sales: RxCollection<SaleDocType>;
    customers: RxCollection<CustomerDocType>;
};

export type PosDatabase = RxDatabase<DatabaseCollections>;

let dbPromise: Promise<PosDatabase> | null = null;

export const getDatabase = (): Promise<PosDatabase> => {
    if (!dbPromise) {
        dbPromise = createRxDatabase<DatabaseCollections>({
            name: 'posdb_v7', // bumped: sale schema + status field for Fiado, customers collection added
            storage: getRxStorageDexie(),
            multiInstance: false,
        }).then(async (db) => {
            await db.addCollections({
                items: { schema: itemSchema },
                sales: { schema: saleSchema },
                customers: { schema: customerSchema },
            });
            return db;
        });
    }
    return dbPromise;
};
