import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { MediaAsset } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ListMediaDto, UploadMediaDto } from "./dto";

@Injectable()
export class MediaService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Store a photo/video and record it. Idempotent on dedupeKey — re-syncing the
   * gallery returns the existing asset instead of duplicating.
   */
  async upload(
    meta: UploadMediaDto,
    file: { buffer: Buffer; mimetype: string },
  ): Promise<MediaAsset> {
    const existing = await this.prisma.mediaAsset.findUnique({
      where: { dedupeKey: meta.dedupeKey },
    });
    if (existing) return this.toAsset(existing);

    const key = this.objectKey(meta);
    await this.storage.putObject(
      key,
      file.buffer,
      file.mimetype || (meta.type === "video" ? "video/mp4" : "image/jpeg"),
    );

    const row = await this.prisma.mediaAsset.create({
      data: {
        type: meta.type,
        storageKey: key,
        sourceFileName: meta.sourceFileName,
        sizeBytes: file.buffer.length,
        capturedAt: new Date(meta.capturedAt),
        dedupeKey: meta.dedupeKey,
      },
    });
    return this.toAsset(row);
  }

  async list(
    query: ListMediaDto,
  ): Promise<{ data: MediaAsset[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.MediaAssetWhereInput = {};
    if (query.type) where.type = query.type;

    const [rows, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { capturedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    const data = await Promise.all(rows.map((r) => this.toAsset(r)));
    return { data, total, page, limit };
  }

  private objectKey(meta: UploadMediaDto): string {
    const safe = meta.sourceFileName.replace(/[^A-Za-z0-9._-]/g, "_");
    return `media/${meta.type}/${new Date(meta.capturedAt).getTime()}-${safe}`;
  }

  private async toAsset(row: {
    id: string;
    type: string;
    storageKey: string;
    sourceFileName: string;
    sizeBytes: number;
    capturedAt: Date;
    createdAt: Date;
  }): Promise<MediaAsset> {
    return {
      id: row.id,
      type: row.type as MediaAsset["type"],
      url: await this.storage.getSignedUrl(row.storageKey),
      sourceFileName: row.sourceFileName,
      sizeBytes: row.sizeBytes,
      capturedAt: row.capturedAt.toISOString(),
      createdAt: row.createdAt.toISOString(),
    };
  }
}
