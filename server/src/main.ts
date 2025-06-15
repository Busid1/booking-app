import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true}));
  app.enableCors({
    origin: 'http://localhost:4200', // o '*' en desarrollo, pero mejor restringir
    credentials: true,
  });
  await app.listen(2000);
}
bootstrap();
