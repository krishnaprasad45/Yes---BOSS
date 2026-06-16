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
import { ListMediaDto, UploadMediaDto } from "./dto";
import { MediaService } from "./media.service";

@Controller("media")
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private service: MediaService) {}

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 200 * 1024 * 1024 } }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() meta: UploadMediaDto,
  ) {
    if (!file) throw new BadRequestException("Missing media file");
    const asset = await this.service.upload(meta, file);
    return ok(asset, "Media backed up");
  }

  @Get()
  async list(@Query() query: ListMediaDto) {
    const { data, total, page, limit } = await this.service.list(query);
    return paginated(data, total, page, limit);
  }
}
