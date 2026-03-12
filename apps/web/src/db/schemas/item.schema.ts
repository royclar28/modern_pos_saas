import { RxJsonSchema } from 'rxdb';

export type ItemDocType = {
    id: string;
    name: string;
    category: string;
    itemNumber?: string;
    description?: string;
    costPrice: number;
    unitPrice: number;
    reorderLevel: number;
    receivingQuantity: number;
    allowAltDescription: boolean;
    isSerialized: boolean;
    updatedAt: number; // Unix timestamp for delta sync checkpoint
};

export const itemSchema: RxJsonSchema<ItemDocType> = {
    title: 'Item schema',
    description: 'Product catalog items',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        category: { type: 'string' },
        itemNumber: { type: 'string' },
        description: { type: 'string' },
        costPrice: { type: 'number' },
        unitPrice: { type: 'number' },
        reorderLevel: { type: 'number' },
        receivingQuantity: { type: 'number' },
        allowAltDescription: { type: 'boolean' },
        isSerialized: { type: 'boolean' },
        updatedAt: { type: 'number' },
    },
    required: ['id', 'name', 'category', 'costPrice', 'unitPrice', 'updatedAt'],
};
