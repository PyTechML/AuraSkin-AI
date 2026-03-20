import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./core/app.module";
import { bootstrap } from "./core/bootstrap";
import { logger } from "./core/logger";
import { captureException } from "./core/sentry/sentry.service";

async function run(): Promise<void> {
  bootstrap();
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    })
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? true,
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  logger.log(`Backend listening on port ${port}`);
}

run().catch((err) => {
  captureException(err, { phase: "startup" });
  logger.error("Server failed to start", err);
  process.exit(1);
});
