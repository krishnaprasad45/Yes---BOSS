import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { DistanceQueryDto, SyncLocationDto } from "./dto";
import { LocationService } from "./location.service";

@Controller("location")
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private service: LocationService) {}

  /** Device pushes a batch of GPS points; dedupe by dedupeKey. */
  @Post("points")
  async sync(@Body() dto: SyncLocationDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  @Get("distance")
  async distance(@Query() query: DistanceQueryDto) {
    const summary = await this.service.distance(query);
    return ok(summary, "Distance travelled");
  }
}
