import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port, "0.0.0.0"); // 0.0.0.0 so the phone on the same wifi can reach it
  console.log(`Backend listening on http://localhost:${port}/api/v1`);
}

bootstrap();
