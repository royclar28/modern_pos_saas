import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.enableCors({
        origin: 'http://localhost:5173', // Vite dev server default
        credentials: true,
    });
    await app.listen(3001);
    console.log('🚀 NestJS API running at http://localhost:3001');
}

bootstrap();
