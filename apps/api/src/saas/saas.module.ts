import { Module } from '@nestjs/common';
import { SaasController } from './saas.controller';
import { SaasService } from './saas.service';
import { PrismaService } from '../prisma.service';
import { EmailService } from './email.service';

@Module({
  controllers: [SaasController],
  providers: [SaasService, PrismaService, EmailService]
})
export class SaasModule {}
