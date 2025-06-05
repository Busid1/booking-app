import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: 'http://localhost:4200', // o '*' en desarrollo, pero mejor restringir
    credentials: true,
  });
  await app.listen(2000);
}
bootstrap();
