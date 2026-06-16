import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { DigestQueryDto, RangeQueryDto } from "./dto";
import { StatsService } from "./stats.service";

@Controller("stats")
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private service: StatsService) {}

  @Get("overview")
  async overview(@Query() query: RangeQueryDto) {
    const stats = await this.service.overview(query.from, query.to);
    return ok(stats, "Dashboard stats");
  }

  @Get("digest")
  async digest(@Query() query: DigestQueryDto) {
    const digest = await this.service.digest(query.date);
    return ok(digest, "Daily digest");
  }

  @Get("subscriptions")
  async subscriptions() {
    const subs = await this.service.subscriptions();
    return ok(subs, "Detected subscriptions");
  }

  @Get("peak-usage")
  async peakUsage(@Query() query: RangeQueryDto) {
    const buckets = await this.service.peakUsage(query.from, query.to);
    return ok(buckets, "Call volume by hour");
  }
}
