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
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ok, paginated } from "../common/envelope";
import { CallService } from "./call.service";
import { ListCallsDto, SyncCallsDto, UploadCallDto } from "./dto";

@Controller("calls")
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private service: CallService) {}

  /** Device pushes a batch of call-log entries (metadata only). */
  @Post("sync")
  async sync(@Body() dto: SyncCallsDto) {
    const result = await this.service.sync(dto);
    return ok(result, `Synced ${result.inserted} new, skipped ${result.skipped}`);
  }

  /** Multipart upload of a single recording + its call metadata. */
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadCallDto,
  ) {
    if (!file) throw new BadRequestException("Missing recording file");
    const call = await this.service.uploadRecording(meta, file);
    return ok(call, "Recording uploaded");
  }

  @Get()
  async list(@Query() query: ListCallsDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }
}
