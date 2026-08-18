import { INestApplication, ValidationPipe } from "@nestjs/common";

/**
 * Shared between the real bootstrap (main.ts) and the e2e tests, so the tests
 * exercise exactly the same application pipeline.
 */
export function configureApp<T extends INestApplication>(app: T): T {
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  return app;
}
