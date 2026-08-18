-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GoalPeriod" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "HabitStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "EventSource" AS ENUM ('CORE', 'SOTREINA');

-- CreateEnum
CREATE TYPE "MetricSource" AS ENUM ('CORE', 'SOTREINA');

-- CreateTable
CREATE TABLE "USER" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "USER_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AREA" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "AREA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GOAL" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "GoalStatus" NOT NULL,
    "startDate" TIMESTAMPTZ(0),
    "targetDate" TIMESTAMPTZ(0),
    "targetValue" DOUBLE PRECISION,
    "unit" TEXT,
    "period" "GoalPeriod",
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "GOAL_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GOAL_AREA" (
    "goalId" UUID NOT NULL,
    "areaId" UUID NOT NULL,

    CONSTRAINT "GOAL_AREA_pkey" PRIMARY KEY ("goalId","areaId")
);

-- CreateTable
CREATE TABLE "HABIT" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "frequency" "HabitFrequency" NOT NULL,
    "frequencyTarget" INTEGER NOT NULL,
    "targetValue" DOUBLE PRECISION,
    "targetUnit" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "status" "HabitStatus" NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "HABIT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EVENT" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "source" "EventSource" NOT NULL,
    "occurredAt" TIMESTAMPTZ(0) NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "EVENT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "METRIC" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recordedAt" TIMESTAMPTZ(0) NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" "MetricSource" NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "METRIC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NOTE" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(0) NOT NULL,

    CONSTRAINT "NOTE_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_unique" ON "USER"("email");

-- CreateIndex
CREATE UNIQUE INDEX "area_name_unique" ON "AREA"("userId", "name");

-- CreateIndex
CREATE INDEX "event_userId_occurredAt" ON "EVENT"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "metric_userId_key_recordedAt" ON "METRIC"("userId", "key", "recordedAt");

-- AddForeignKey
ALTER TABLE "AREA" ADD CONSTRAINT "AREA_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GOAL" ADD CONSTRAINT "GOAL_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GOAL_AREA" ADD CONSTRAINT "GOAL_AREA_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "GOAL"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GOAL_AREA" ADD CONSTRAINT "GOAL_AREA_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "AREA"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HABIT" ADD CONSTRAINT "HABIT_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EVENT" ADD CONSTRAINT "EVENT_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "METRIC" ADD CONSTRAINT "METRIC_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NOTE" ADD CONSTRAINT "NOTE_userId_fkey" FOREIGN KEY ("userId") REFERENCES "USER"("id") ON DELETE CASCADE ON UPDATE CASCADE;
