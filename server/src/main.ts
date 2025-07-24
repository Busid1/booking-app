import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';
import { existsSync } from 'fs';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors({ origin: true, credentials: true });

  const clientPath = join(__dirname, '..', '..', 'client', 'dist', 'frontend', 'browser');

  if (!existsSync(join(clientPath, 'index.html'))) {
    throw new Error(`index.html no encontrado en ${clientPath}`);
  }

  app.use(express.static(clientPath));

  const httpAdapter = app.getHttpAdapter().getInstance();
  
  httpAdapter.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(join(clientPath, 'index.html'));
  });
  
  const port = process.env.PORT || 2000;
  await app.listen(port);
  console.log(`🚀 App listening at port ${port}`);
}
bootstrap();
