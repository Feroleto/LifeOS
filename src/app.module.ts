import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";

import { validateEnv } from "./config/env";
import { AreasModule } from "./modules/areas/areas.module";
import { EventsModule } from "./modules/events/events.module";
import { GoalsModule } from "./modules/goals/goals.module";
import { HabitsModule } from "./modules/habits/habits.module";
import { MetricsModule } from "./modules/metrics/metrics.module";
import { NotesModule } from "./modules/notes/notes.module";
import { TimelineModule } from "./modules/timeline/timeline.module";
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
    HabitsModule,
    EventsModule,
    MetricsModule,
    NotesModule,
    TimelineModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: CurrentUserGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
