import { Body, Controller, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto, RefreshDto } from "./dto";
import { ok } from "../common/envelope";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  /** Mint a long-lived token for the background recap worker. */
  @Post("device-token")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async deviceToken(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string; email: string } }).user;
    const result = await this.auth.issueDeviceToken(user.id, user.email);
    return ok(result, "Device token issued");
  }

  @Post("login")
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password);
    return ok(result, "Logged in");
  }

  @Post("refresh")
  @HttpCode(200)
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.auth.refresh(dto.refreshToken);
    return ok(tokens, "Token refreshed");
  }
}
