import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok, paginated } from "../common/envelope";
import { ErrorResponseDto, PaginatedResponseDto, SuccessResponseDto } from "../common/response.dto";
import { CallService } from "./call.service";
import { ListCallsDto, SyncCallsDto, UploadCallDto } from "./dto";

@ApiTags("[2] Calls")
@ApiBearerAuth("bearer")
@Controller("calls")
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private service: CallService) {}

  @Post("sync")
  @ApiOperation({ summary: "Push a batch of call-log entries (metadata only, no audio)" })
  @ApiBody({
    type: SyncCallsDto,
    examples: {
      default: {
        value: {
          items: [
            { phoneNumber: "+919876543210", direction: "incoming", durationSec: 75, occurredAt: "2025-06-20T10:30:00.000Z", contactName: "John Doe" },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Returns inserted/skipped counts", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async sync(@Body() dto: SyncCallsDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Upload a single call recording (multipart/form-data, max 50 MB)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "phoneNumber", "direction", "durationSec", "occurredAt", "sourceFileName"],
      properties: {
        file: { type: "string", format: "binary", description: "Recording file (mp4/m4a/wav)" },
        phoneNumber: { type: "string", example: "+919876543210" },
        direction: { type: "string", enum: ["incoming", "outgoing", "missed", "rejected"], example: "incoming" },
        durationSec: { type: "integer", example: 75 },
        occurredAt: { type: "string", format: "date-time", example: "2025-06-20T10:30:00.000Z" },
        sourceFileName: { type: "string", example: "call_20250620_103000.mp4" },
        contactName: { type: "string", example: "John Doe" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Recording uploaded; returns call record", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Missing file or validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadCallDto,
  ) {
    if (!file) throw new BadRequestException("Missing recording file");
    const call = await this.service.uploadRecording(meta, file);
    return ok(call, "Recording uploaded");
  }

  @Get()
  @ApiOperation({ summary: "List call records (paginated)" })
  @ApiResponse({ status: 200, description: "Paginated call list", type: PaginatedResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async list(@Query() query: ListCallsDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }
}
