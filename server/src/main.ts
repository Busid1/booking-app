import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const clientPath = join(__dirname, '..', '..', 'client', 'dist', 'frontend', 'browser');

  app.use(express.static(clientPath));

  app.use((req, res) => {
    res.sendFile(join(clientPath, 'index.html'));
  });

  const port = process.env.PORT || 2000;
  await app.listen(port);
  console.log(`🚀 App running in PORT ${port}`);
}
bootstrap();