import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { ok } from "../common/envelope";

@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  health() {
    return ok({ up: true }, "Healthy");
  }

  /** Authed probe — verifies JWT + DB in one call. Used by the app after login. */
  @Get("secure")
  @UseGuards(JwtAuthGuard)
  async secure() {
    await this.prisma.$queryRaw`SELECT 1`;
    return ok({ up: true, db: true }, "Healthy (authed)");
  }
}
