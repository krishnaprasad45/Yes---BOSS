import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import { DistanceQueryDto, SyncLocationDto } from "./dto";
import { LocationService } from "./location.service";

@ApiTags("[8] Location")
@ApiBearerAuth("bearer")
@Controller("location")
@UseGuards(JwtAuthGuard)
export class LocationController {
  constructor(private service: LocationService) {}

  @Post("points")
  @ApiOperation({ summary: "Push a batch of GPS points (deduped by dedupeKey)" })
  @ApiBody({
    type: SyncLocationDto,
    examples: {
      default: {
        value: {
          points: [
            { lat: 12.9716, lng: 77.5946, recordedAt: "2025-06-20T10:30:00.000Z", dedupeKey: "12.9716_77.5946_1750420200000" },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Returns inserted/skipped counts", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async sync(@Body() dto: SyncLocationDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  @Get("distance")
  @ApiOperation({ summary: "Total distance travelled (km) for a date range" })
  @ApiResponse({ status: 200, description: "Distance summary with total km", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async distance(@Query() query: DistanceQueryDto) {
    const summary = await this.service.distance(query);
    return ok(summary, "Distance travelled");
  }
}
