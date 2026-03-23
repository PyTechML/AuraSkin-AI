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
  const port = Number(process.env.PORT) || 3001;
  try {
    await app.listen(port);
    logger.log(`Backend listening on port ${port}`);
  } catch (listenErr: unknown) {
    const code =
      listenErr && typeof listenErr === "object" && "code" in listenErr
        ? String((listenErr as { code?: string }).code)
        : "";
    if (code === "EADDRINUSE") {
      logger.error(
        `Port ${port} is already in use (EADDRINUSE). Stop the other Node/Nest process or change PORT in .env. See docs/local-dev.md.`
      );
    }
    throw listenErr;
  }
}

run().catch((err) => {
  captureException(err, { phase: "startup" });
  logger.error("Server failed to start", err);
  process.exit(1);
});
