import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const DEFAULT_ORIGINS = ['https://bookly-39896.web.app', 'https://bookly-39896.firebaseapp.com', 'http://localhost:4200'];

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const extraOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map(o => o.trim()).filter(Boolean);
  app.enableCors({
    origin: [...DEFAULT_ORIGINS, ...extraOrigins],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  app.enableShutdownHooks();

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}

bootstrap();
