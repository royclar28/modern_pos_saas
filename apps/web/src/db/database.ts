import Dexie, { Table } from 'dexie';

export interface Product {
    id: string;
    name: string;
    price: number;
    category_id: string;
    updated_at: string;
}

export interface Category {
    id: string;
    name: string;
    updated_at: string;
}

export class MerxPOSDatabase extends Dexie {
    products!: Table<Product, string>;
    categories!: Table<Category, string>;

    constructor() {
        super('MerxPOSDatabase');
        
        this.version(1).stores({
            products: 'id, name, price, category_id, updated_at',
            categories: 'id, name, updated_at'
        });
    }
}

export const db = new MerxPOSDatabase();
