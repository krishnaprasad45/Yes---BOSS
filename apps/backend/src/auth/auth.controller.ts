import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto, RefreshDto } from "./dto";
import { ok } from "../common/envelope";

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

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
