import "reflect-metadata";

import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import type { Env } from "./config/env";

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));

  app.enableShutdownHooks();

  const config = app.get(ConfigService<Env, true>);
  const port = config.get("PORT", { infer: true });

  await app.listen(port);

  new Logger("Bootstrap").log(`Life OS API on http://localhost:${port}/api`);
}

void bootstrap();
