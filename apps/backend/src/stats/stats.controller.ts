import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import { DigestQueryDto, RangeQueryDto } from "./dto";
import { StatsService } from "./stats.service";

@ApiTags("[5] Stats")
@ApiBearerAuth("bearer")
@Controller("stats")
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private service: StatsService) {}

  @Get("overview")
  @ApiOperation({ summary: "Dashboard overview — call counts, SMS totals, location distance for a date range" })
  @ApiResponse({ status: 200, description: "Aggregated overview stats", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async overview(@Query() query: RangeQueryDto) {
    const stats = await this.service.overview(query.from, query.to);
    return ok(stats, "Dashboard stats");
  }

  @Get("digest")
  @ApiOperation({ summary: "Daily digest — per-day rollup of calls + spend for a single day" })
  @ApiResponse({ status: 200, description: "Daily digest data", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async digest(@Query() query: DigestQueryDto) {
    const digest = await this.service.digest(query.date);
    return ok(digest, "Daily digest");
  }

  @Get("subscriptions")
  @ApiOperation({ summary: "Detected recurring subscriptions from SMS transaction history" })
  @ApiResponse({ status: 200, description: "List of detected subscriptions", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async subscriptions() {
    const subs = await this.service.subscriptions();
    return ok(subs, "Detected subscriptions");
  }

  @Get("peak-usage")
  @ApiOperation({ summary: "Call volume bucketed by hour of day for a date range" })
  @ApiResponse({ status: 200, description: "24-bucket array (0–23h) with call counts", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async peakUsage(@Query() query: RangeQueryDto) {
    const buckets = await this.service.peakUsage(query.from, query.to);
    return ok(buckets, "Call volume by hour");
  }
}
