import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";

import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async check(): Promise<{ status: string; database: string; uptime: number }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: "error",
        database: "down",
      });
    }

    return {
      status: "ok",
      database: "up",
      uptime: Math.round(process.uptime()),
    };
  }
}
