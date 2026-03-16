import { Module, Logger } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import { PrismaService } from '../prisma.service';
import { execSync } from 'child_process';

const token = process.env.TELEGRAM_BOT_TOKEN;
let isValidToken = false;

if (token) {
  try {
    const output = execSync(`curl -s https://api.telegram.org/bot${token}/getMe`, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);
    isValidToken = parsed.ok === true;
  } catch (e) {
    isValidToken = false;
  }
}

if (!isValidToken && token) {
  Logger.warn('Telegram token is invalid. Telegram bot will not be started.', 'TelegramModule');
} else if (!token) {
  Logger.warn('Telegram token is missing. Telegram bot will not be started.', 'TelegramModule');
}

@Module({
  imports: isValidToken && token
    ? [
        TelegrafModule.forRoot({
          token,
        }),
      ]
    : [],
  providers: [
    TelegramService,
    ...(isValidToken && token ? [TelegramUpdate] : []),
    PrismaService,
  ],
  exports: [TelegramService],
})
export class TelegramModule {}
