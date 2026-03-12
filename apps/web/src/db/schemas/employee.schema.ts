import { RxJsonSchema } from 'rxdb';

export type EmployeeDocType = {
    id: string; // RxDB prefieres strings as PKs
    username: string;
    // Note: we might not want to sync the password hash to the frontend, 
    // but it's here for completeness if offline auth is needed.
    password?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    address?: string;
    updatedAt: number; // Unix timestamp
    deleted: boolean;
};

export const employeeSchema: RxJsonSchema<EmployeeDocType> = {
    title: 'Employee schema',
    description: 'Point of sale users/employees mapped from ospos_employees and ospos_people',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        username: { type: 'string' },
        password: { type: 'string' }, // Omit required validation just in case we strip it during sync
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        address: { type: 'string' },
        updatedAt: { type: 'number' },
        deleted: { type: 'boolean' }
    },
    required: ['id', 'username', 'firstName', 'lastName', 'updatedAt', 'deleted']
};
