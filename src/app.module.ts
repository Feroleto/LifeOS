import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";

import { validateEnv } from "./config/env";
import { AreasModule } from "./modules/areas/areas.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { UsersModule } from "./modules/users/users.module";
import { CurrentUserGuard } from "./shared/auth/current-user.guard";
import { PrismaExceptionFilter } from "./shared/filters/prisma-exception.filter";
import { HealthModule } from "./shared/health/health.module";
import { PrismaModule } from "./shared/prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    UsersModule,
    AreasModule,
    GoalsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CurrentUserGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
