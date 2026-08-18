import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";

import { AppModule } from "../../src/app.module";
import { configureApp } from "../../src/app.setup";
import { PrismaService } from "../../src/shared/prisma/prisma.service";

export interface TestContext {
  app: INestApplication;
  prisma: PrismaService;
}

export async function createTestApp(): Promise<TestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();

  const app = configureApp(moduleRef.createNestApplication());
  await app.init();

  return { app, prisma: app.get(PrismaService) };
}

/** USER is the root of every cascade — truncating it empties the test database. */
export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "USER" CASCADE');
}
