import { Body, Controller, HttpCode, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginDto, RefreshDto } from "./dto";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";

@ApiTags("[1] Auth")
@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  @ApiOperation({ summary: "Login with email + password, receive JWT tokens" })
  @ApiBody({
    type: LoginDto,
    examples: {
      default: { value: { email: "boss@example.com", password: "SuperSecret1" } },
    },
  })
  @ApiResponse({ status: 200, description: "Returns accessToken + refreshToken", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials", type: ErrorResponseDto })
  async login(@Body() dto: LoginDto) {
    const result = await this.auth.login(dto.email, dto.password);
    return ok(result, "Logged in");
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiOperation({ summary: "Exchange a refresh token for a new token pair" })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: "New accessToken + refreshToken", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Refresh token invalid or expired", type: ErrorResponseDto })
  async refresh(@Body() dto: RefreshDto) {
    const tokens = await this.auth.refresh(dto.refreshToken);
    return ok(tokens, "Token refreshed");
  }

  @Post("device-token")
  @HttpCode(200)
  @ApiBearerAuth("bearer")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Issue a long-lived device token for the background recap worker" })
  @ApiResponse({ status: 200, description: "Long-lived device token (no expiry)", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async deviceToken(@Req() req: Request) {
    const user = (req as unknown as { user: { id: string; email: string } }).user;
    const result = await this.auth.issueDeviceToken(user.id, user.email);
    return ok(result, "Device token issued");
  }
}
