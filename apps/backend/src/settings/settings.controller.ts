import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import { UpdateAutoReplyDto } from "./dto";
import { SettingsService } from "./settings.service";

@ApiTags("[6] Settings")
@ApiBearerAuth("bearer")
@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get("auto-reply")
  @ApiOperation({ summary: "Get current auto-reply + recap config for the authenticated user" })
  @ApiResponse({ status: 200, description: "Auto-reply configuration", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async getAutoReply(@CurrentUser() user: AuthUser) {
    const config = await this.service.getAutoReply(user.id);
    return ok(config, "Auto-reply config");
  }

  @Put("auto-reply")
  @ApiOperation({ summary: "Update auto-reply + recap config (partial update — only send fields you want to change)" })
  @ApiBody({
    type: UpdateAutoReplyDto,
    examples: {
      "enable-auto-reply": {
        summary: "Enable basic auto-reply",
        value: { enabled: true, message: "I'm busy. I'll call you back soon.", cooldownMinutes: 60 },
      },
      "enable-smart-recap": {
        summary: "Enable recap with smart mode",
        value: { recapEnabled: true, recapNumber: "+919876543210", recapMode: "smart" },
      },
    },
  })
  @ApiResponse({ status: 200, description: "Updated auto-reply configuration", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async updateAutoReply(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAutoReplyDto,
  ) {
    const config = await this.service.updateAutoReply(user.id, dto);
    return ok(config, "Auto-reply config updated");
  }
}
