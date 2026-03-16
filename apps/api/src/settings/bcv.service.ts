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
    for (const store of stores) {
      await this.updateBcvRate(store.id);
    }
  }

  async updateBcvRate(storeId: string) {
    this.logger.debug(`Fetching BCV rate from API for store ${storeId}...`);
    try {
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) {
        throw new Error(`BCV API Error: ${response.status}`);
      }
      const data = await response.json();
      const rate = data.promedio;

      if (!rate) {
        throw new Error('Invalid rate received from BCV API');
      }

      await this.prisma.storeConfig.upsert({
        where: { key: `exchange_rate_${storeId}` },
        update: { value: String(rate) },
        create: { key: `exchange_rate_${storeId}`, value: String(rate), storeId },
      });

      this.logger.log(`BCV Rate successfully updated to Bs. ${rate} for store ${storeId}`);
    } catch (error) {
      this.logger.error('Failed to fetch/update BCV rate', error instanceof Error ? error.message : error);
    }
  }
}
