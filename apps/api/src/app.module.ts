import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { SyncController } from './sync.controller';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { SettingsModule } from './settings/settings.module';
import { InventoryModule } from './inventory/inventory.module';
import { TelegramModule } from './telegram/telegram.module';

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
            exclude: ['/api/(.*)'],
        }),
        AuthModule,
        ItemsModule,
        SettingsModule,
        InventoryModule,
        ScheduleModule.forRoot(),
        TelegramModule
    ],
    controllers: [SyncController],
    providers: [PrismaService],
})
export class AppModule { }
