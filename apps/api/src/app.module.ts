import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { SyncController } from './sync.controller';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { SettingsModule } from './settings/settings.module';

@Module({
    imports: [AuthModule, ItemsModule, SettingsModule, ScheduleModule.forRoot()],
    controllers: [SyncController],
    providers: [PrismaService],
})
export class AppModule { }
