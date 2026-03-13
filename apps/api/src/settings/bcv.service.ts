import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BcvService implements OnModuleInit {
  private readonly logger = new Logger(BcvService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.updateBcvRate();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async updateBcvRate() {
    this.logger.debug('Fetching BCV rate from API...');
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
        where: { key: 'exchange_rate' },
        update: { value: String(rate) },
        create: { key: 'exchange_rate', value: String(rate) },
      });

      this.logger.log(`BCV Rate successfully updated to Bs. ${rate}`);
    } catch (error) {
      this.logger.error('Failed to fetch/update BCV rate', error instanceof Error ? error.message : error);
    }
  }
}
