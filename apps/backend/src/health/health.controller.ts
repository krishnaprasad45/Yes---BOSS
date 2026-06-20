import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";

@ApiTags("[9] Health")
@Controller("health")
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "Liveness probe — confirms the server is up (no auth required)" })
  @ApiResponse({ status: 200, description: '{ up: true }', type: SuccessResponseDto })
  health() {
    return ok({ up: true }, "Healthy");
  }

  @Get("secure")
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Readiness probe — verifies JWT auth + DB connectivity in one call" })
  @ApiResponse({ status: 200, description: '{ up: true, db: true }', type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async secure() {
    await this.prisma.$queryRaw`SELECT 1`;
    return ok({ up: true, db: true }, "Healthy (authed)");
  }
}
