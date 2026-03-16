import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 1. ESTO ES VITAL: Todo el backend ahora vivirá bajo /api
    app.setGlobalPrefix('api');

    // 2. CORS (Se mantiene igual)
    app.enableCors({
        origin: true,
        credentials: true,
    });

    // 3. Levantar el servidor
    const port = process.env.PORT || 3333;
    await app.listen(port);

    // 4. Logs actualizados para mayor claridad
    console.log(`🚀 NestJS API endpoints running at http://localhost:${port}/api`);
    console.log(`🌐 React PWA (Frontend) running at http://localhost:${port}`);
}

bootstrap();