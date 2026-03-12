import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SyncController } from './sync.controller';
import { AuthModule } from './auth/auth.module';
import { ItemsModule } from './items/items.module';
import { SettingsModule } from './settings/settings.module';

@Module({
    imports: [AuthModule, ItemsModule, SettingsModule],
    controllers: [SyncController],
    providers: [PrismaService],
})
export class AppModule { }
