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
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok, paginated } from "../common/envelope";
import { ErrorResponseDto, PaginatedResponseDto, SuccessResponseDto } from "../common/response.dto";
import { ListMediaDto, UploadMediaDto } from "./dto";
import { MediaService } from "./media.service";

@ApiTags("[7] Media")
@ApiBearerAuth("bearer")
@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private service: MediaService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 200 * 1024 * 1024 } }))
  @ApiOperation({ summary: "Upload a photo or video for cloud backup (multipart/form-data, max 200 MB)" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "type", "sourceFileName", "capturedAt", "dedupeKey"],
      properties: {
        file: { type: "string", format: "binary", description: "Image or video file" },
        type: { type: "string", enum: ["photo", "video"], example: "photo" },
        sourceFileName: { type: "string", example: "IMG_20250620_103000.jpg" },
        capturedAt: { type: "string", format: "date-time", example: "2025-06-20T10:30:00.000Z" },
        dedupeKey: { type: "string", example: "sha256_abc123", description: "Stable hash to prevent duplicate uploads" },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Returns uploaded media asset record", type: SuccessResponseDto })
  @ApiResponse({ status: 400, description: "Missing file or validation error", type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadMediaDto,
  ) {
    if (!file) throw new BadRequestException("Missing media file");
    const asset = await this.service.upload(meta, file);
    return ok(asset, "Media backed up");
  }

  @Get()
  @ApiOperation({ summary: "List backed-up media (paginated, filterable by type)" })
  @ApiResponse({ status: 200, description: "Paginated media list", type: PaginatedResponseDto })
  @ApiResponse({ status: 401, description: "Unauthorized", type: ErrorResponseDto })
  async list(@Query() query: ListMediaDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }
}
