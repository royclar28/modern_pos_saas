import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: true, // Allow all origins for dev server
        credentials: true,
    });
    await app.listen(3001);
    console.log('🚀 NestJS API running at http://localhost:3001');
}

bootstrap();
