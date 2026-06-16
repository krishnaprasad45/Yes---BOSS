import { Body, Controller, Get, Put, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthUser, CurrentUser } from "../common/current-user.decorator";
import { ok } from "../common/envelope";
import { UpdateAutoReplyDto } from "./dto";
import { SettingsService } from "./settings.service";

@Controller("settings")
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private service: SettingsService) {}

  @Get("auto-reply")
  async getAutoReply(@CurrentUser() user: AuthUser) {
    const config = await this.service.getAutoReply(user.id);
    return ok(config, "Auto-reply config");
  }

  @Put("auto-reply")
  async updateAutoReply(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateAutoReplyDto,
  ) {
    const config = await this.service.updateAutoReply(user.id, dto);
    return ok(config, "Auto-reply config updated");
  }
}
