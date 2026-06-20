import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import { BulkService } from "./bulk.service";

@ApiTags("[10] Bulk")
@ApiBearerAuth("bearer")
@Controller("bulk")
@UseGuards(JwtAuthGuard)
export class BulkController {
  constructor(private service: BulkService) {}

  @Get()
  @ApiOperation({
    summary: "One-shot hydration snapshot for offline-first app launch",
    description:
      "Composes calls (first 10), SMS (first 10), spending summary, all dashboard stats, distance & settings into a single response. The app persists each slice to disk so every tab works without internet.",
  })
  @ApiResponse({ status: 200, description: "Full bulk snapshot", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async snapshot(@CurrentUser() user: AuthUser) {
    const data = await this.service.snapshot(user.id);
    return ok(data, "Bulk snapshot");
  }
}
