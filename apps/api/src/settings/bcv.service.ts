import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BcvService implements OnModuleInit {
  private readonly logger = new Logger(BcvService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // On startup, update BCV rate for all stores
    await this.updateBcvRateForAllStores();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async updateBcvRateForAllStores() {
    const stores = await this.prisma.store.findMany({ select: { id: true } });
    // Ejecutar en secuencia para evitar race conditions contra la API del BCV
    for (const store of stores) {
      await this.updateBcvRate(store.id);
    }
  }

  async updateBcvRate(storeId: string) {
    this.logger.debug(`Fetching BCV rate from API for store ${storeId}...`);
    try {
      // 1. Intentar múltiples fuentes de API en caso de que una falle
      let rate: number | null = null;

      try {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (response.ok) {
          const data = await response.json();
          rate = data.promedio || data.precio || null;
        }
      } catch {
        this.logger.warn('Primary BCV API (dolarapi.com) failed, trying fallback...');
      }

      // Fallback: pydolarve
      if (!rate) {
        try {
          const fallbackResponse = await fetch('https://pydolarve.org/api/v1/dollar?page=bcv');
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            // Estructura: { monitors: { usd: { price: 45.50 } } }
            rate = fallbackData?.monitors?.usd?.price || null;
          }
        } catch {
          this.logger.warn('Fallback BCV API (pydolarve) also failed');
        }
      }

      if (!rate || rate <= 0) {
        throw new Error('Could not obtain a valid BCV rate from any source');
      }

      const configKey = 'exchange_rate'; // Ahora la key es exactamente la public key.
      try {
        await this.prisma.storeConfig.upsert({
          where: { storeId_key: { storeId, key: configKey } },
          update: { value: String(rate) },
          create: { key: configKey, value: String(rate), storeId },
        });
      } catch (dbError: any) {
        // Si hay un conflicto de unicidad (race condition entre tiendas), simplemente hacemos un update
        if (dbError.code === 'P2002') {
          this.logger.warn(`Unique constraint hit for key ${configKey}, retrying with update...`);
          await this.prisma.storeConfig.update({
            where: { storeId_key: { storeId, key: configKey } },
            data: { value: String(rate) },
          });
        } else {
          throw dbError;
        }
      }

      this.logger.log(`BCV Rate successfully updated to Bs. ${rate} for store ${storeId}`);
    } catch (error) {
      this.logger.error(`Failed to fetch/update BCV rate for store ${storeId}:`, error instanceof Error ? error.message : error);
    }
  }
}
