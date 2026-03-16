import { RxJsonSchema } from 'rxdb';

export type CustomerDocType = {
    id: string; // RxDB prefieres strings as PKs
    storeId: string;
    companyName?: string;
    accountNumber?: string;
    taxable: boolean;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    updatedAt: number; // Unix timestamp
    deleted: boolean;
};

export const customerSchema: RxJsonSchema<CustomerDocType> = {
    title: 'Customer schema',
    description: 'Point of sale customers mapped from ospos_customers and ospos_people',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        storeId: { type: 'string', maxLength: 100 },
        companyName: { type: 'string' },
        accountNumber: { type: 'string' },
        taxable: { type: 'boolean' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        updatedAt: { type: 'number' },
        deleted: { type: 'boolean' }
    },
    required: ['id', 'storeId', 'taxable', 'firstName', 'lastName', 'updatedAt', 'deleted']
};
