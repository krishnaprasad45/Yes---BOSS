import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { RecapService } from "./recap.service";

@Controller("calls")
@UseGuards(JwtAuthGuard)
export class RecapController {
  constructor(private service: RecapService) {}

  /** Whether transcription + summary providers are configured. */
  @Get("recap/status")
  status() {
    return ok(this.service.status(), "Recap provider status");
  }

  /** Generate (or regenerate with ?force=true) the recap for one call. */
  @Post(":id/recap")
  async generate(@Param("id") id: string, @Query("force") force?: string) {
    const call = await this.service.generate(id, force === "true");
    return ok(call, "Recap generated");
  }
}
