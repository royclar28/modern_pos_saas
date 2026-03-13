import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { PrismaService } from '../prisma.service';
import { BcvService } from './bcv.service';

@Module({
    controllers: [SettingsController],
    providers: [SettingsService, PrismaService, BcvService],
    exports: [SettingsService], // Available to other modules if needed
})
export class SettingsModule {}
