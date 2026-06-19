import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { UploadCallDto } from "../call/dto";
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

  /**
   * Background worker uploads a just-ended recorded call; we return an SMS-ready
   * recap body for the phone to text the owner. Authenticated with the device
   * token.
   */
  @Post("auto-recap")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async autoRecap(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadCallDto,
  ) {
    if (!file) throw new BadRequestException("Missing recording file");
    const result = await this.service.autoRecap(meta, file);
    return ok(result, "Auto recap generated");
  }

  /** Generate (or regenerate with ?force=true) the recap for one call. */
  @Post(":id/recap")
  async generate(@Param("id") id: string, @Query("force") force?: string) {
    const call = await this.service.generate(id, force === "true");
    return ok(call, "Recap generated");
  }
}
