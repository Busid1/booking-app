import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import 'dotenv/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['https://bookly-39896.web.app', 'http://localhost:4200'],
    credentials: true,
  });

  const port = process.env.PORT || 8080;
  await app.listen(port);
  console.log(`Server running on port ${port}`);
}

bootstrap();