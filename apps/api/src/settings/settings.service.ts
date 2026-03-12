import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Keys we expose via the Settings API.
 * All other StoreConfig rows are internal and not surfaced.
 */
const PUBLIC_KEYS = ['default_tax_rate', 'currency_symbol', 'company', 'timezone', 'language'] as const;
type PublicKey = (typeof PUBLIC_KEYS)[number];

export type StoreSettings = Record<PublicKey, string>;

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) {}

    /** Return all public StoreConfig entries as a flat key→value object */
    async getAll(): Promise<StoreSettings> {
        const rows = await this.prisma.storeConfig.findMany({
            where: { key: { in: PUBLIC_KEYS as unknown as string[] } },
        });

        // Build map with safe defaults
        const defaults: StoreSettings = {
            default_tax_rate: '16',
            currency_symbol: '$',
            company: 'Modern POS',
            timezone: 'America/Mexico_City',
            language: 'es',
        };

        for (const row of rows) {
            if (PUBLIC_KEYS.includes(row.key as PublicKey)) {
                defaults[row.key as PublicKey] = row.value;
            }
        }

        return defaults;
    }

    /**
     * Update one or more public settings via upsert.
     * Unknown keys are silently ignored for safety.
     */
    async updateMany(patch: Partial<StoreSettings>): Promise<StoreSettings> {
        const validEntries = Object.entries(patch).filter(([k]) =>
            PUBLIC_KEYS.includes(k as PublicKey),
        );

        await Promise.all(
            validEntries.map(([key, value]) =>
                this.prisma.storeConfig.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value) },
                }),
            ),
        );

        return this.getAll();
    }
}
