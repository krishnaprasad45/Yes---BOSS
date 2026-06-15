import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { Call } from "@yes-boss/shared";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { ListCallsDto, SyncCallsDto, UploadCallDto } from "./dto";

@Injectable()
export class CallService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
  ) {}

  /**
   * Idempotent call-log sync. Dedupe is by @@unique([phoneNumber, occurredAt]);
   * re-syncing the device log never duplicates rows.
   */
  async sync(dto: SyncCallsDto): Promise<{ inserted: number; skipped: number }> {
    if (dto.items.length === 0) return { inserted: 0, skipped: 0 };

    const result = await this.prisma.call.createMany({
      data: dto.items.map((i) => ({
        contactName: i.contactName ?? null,
        phoneNumber: i.phoneNumber,
        direction: i.direction,
        durationSec: i.durationSec,
        occurredAt: new Date(i.occurredAt),
      })),
      skipDuplicates: true,
    });

    return { inserted: result.count, skipped: dto.items.length - result.count };
  }

  /**
   * Store an audio recording and attach it to its call (upserting the call row
   * if the log sync hasn't created it yet). Returns the saved call.
   */
  async uploadRecording(
    meta: UploadCallDto,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<Call> {
    const occurredAt = new Date(meta.occurredAt);
    const key = this.objectKey(meta.phoneNumber, occurredAt, meta.sourceFileName);

    await this.storage.putObject(
      key,
      file.buffer,
      file.mimetype || "audio/mpeg",
    );

    const row = await this.prisma.call.upsert({
      where: {
        phoneNumber_occurredAt: { phoneNumber: meta.phoneNumber, occurredAt },
      },
      create: {
        contactName: meta.contactName ?? null,
        phoneNumber: meta.phoneNumber,
        direction: meta.direction,
        durationSec: meta.durationSec,
        occurredAt,
        recordingUrl: key,
        sourceFileName: meta.sourceFileName,
      },
      update: {
        recordingUrl: key,
        sourceFileName: meta.sourceFileName,
        // backfill contact name if the log row lacked it
        ...(meta.contactName ? { contactName: meta.contactName } : {}),
      },
    });

    return this.toCall(row);
  }

  async list(
    query: ListCallsDto,
  ): Promise<{ data: Call[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.call.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.call.count({ where }),
    ]);

    const data = await Promise.all(rows.map((r) => this.toCall(r)));
    return { data, total, page, limit };
  }

  /** Object layout: <number>/<epoch>-<filename> keeps a recording per call. */
  private objectKey(phoneNumber: string, occurredAt: Date, fileName: string): string {
    const safeNumber = phoneNumber.replace(/[^0-9+]/g, "") || "unknown";
    const safeName = fileName.replace(/[^A-Za-z0-9._-]/g, "_");
    return `${safeNumber}/${occurredAt.getTime()}-${safeName}`;
  }

  private buildWhere(query: ListCallsDto): Prisma.CallWhereInput {
    const where: Prisma.CallWhereInput = {};
    if (query.direction) where.direction = query.direction;
    if (query.from || query.to) {
      const occurredAt: Prisma.DateTimeFilter = {};
      if (query.from) occurredAt.gte = new Date(query.from);
      if (query.to) occurredAt.lte = new Date(query.to);
      where.occurredAt = occurredAt;
    }
    if (query.search) {
      where.OR = [
        { contactName: { contains: query.search, mode: "insensitive" } },
        { phoneNumber: { contains: query.search } },
      ];
    }
    return where;
  }

  private async toCall(row: {
    id: string;
    contactName: string | null;
    phoneNumber: string;
    direction: string;
    durationSec: number;
    occurredAt: Date;
    recordingUrl: string | null;
    transcript: string | null;
    summary: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): Promise<Call> {
    return {
      id: row.id,
      contactName: row.contactName,
      phoneNumber: row.phoneNumber,
      direction: row.direction as Call["direction"],
      durationSec: row.durationSec,
      occurredAt: row.occurredAt.toISOString(),
      // recordingUrl stores the object key; hand back a short-lived signed URL
      recordingUrl: row.recordingUrl
        ? await this.storage.getSignedUrl(row.recordingUrl)
        : null,
      transcript: row.transcript,
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
