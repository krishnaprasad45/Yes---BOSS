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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok } from "../common/envelope";
import { ErrorResponseDto, SuccessResponseDto } from "../common/response.dto";
import { UploadCallDto } from "../call/dto";
import { RecapService } from "./recap.service";

@ApiTags("[3] Recap")
@ApiBearerAuth("bearer")
@Controller("calls")
@UseGuards(JwtAuthGuard)
export class RecapController {
  constructor(private service: RecapService) {}

  @Get("recap/status")
  @ApiOperation({ summary: "Check whether transcription + summary providers are configured" })
  @ApiResponse({ status: 200, description: "Provider status flags", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  status() {
    return ok(this.service.status(), "Recap provider status");
  }

  @Post("auto-recap")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({
    summary: "Background worker endpoint — upload a just-ended recording and receive an SMS-ready recap",
    description: "Authenticated with the device token (POST /api/v1/auth/device-token). The Android background service calls this immediately after a call ends.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "phoneNumber", "direction", "durationSec", "occurredAt", "sourceFileName"],
      properties: {
        file: { type: "string", format: "binary", description: "Recording file (mp4/m4a/wav, max 50 MB)" },
        phoneNumber: { type: "string", example: "+919876543210" },
        direction: { type: "string", enum: ["incoming", "outgoing", "missed", "rejected"], example: "incoming" },
        durationSec: { type: "integer", example: 75 },
        occurredAt: { type: "string", format: "date-time", example: "2025-06-20T10:30:00.000Z" },
        sourceFileName: { type: "string", example: "call_20250620_103000.mp4" },
        contactName: { type: "string", example: "John Doe" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Returns SMS-ready recap text + call record", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Missing file", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async autoRecap(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadCallDto,
  ) {
    if (!file) throw new BadRequestException("Missing recording file");
    const result = await this.service.autoRecap(meta, file);
    return ok(result, "Auto recap generated");
  }

  @Post(":id/recap")
  @ApiOperation({ summary: "Generate (or regenerate) the AI recap for an existing call" })
  @ApiParam({ name: "id", description: "Call record UUID", example: "clxyz123abc" })
  @ApiQuery({ name: "force", required: false, description: "Pass true to re-run even if recap already exists", example: "true" })
  @ApiResponse({ status: 201, description: "Updated call record with recap text", type: SuccessResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: "Call not found", type: ErrorResponseDto })
  async generate(@Param("id") id: string, @Query("force") force?: string) {
    const call = await this.service.generate(id, force === "true");
    return ok(call, "Recap generated");
  }
}
